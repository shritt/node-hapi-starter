'use strict';

const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Pack = require('./package');
const Mongoose = require('mongoose');
const Joi = require('@hapi/joi');

Mongoose.connect('mongodb://localhost:27017/backrub');

const UserModel = Mongoose.model('user', {
  firstname: String,
  lastname: String
});

const init = async () => {
  const server = Hapi.server({
    port: 5000,
    host: 'localhost'
  });

  const swaggerOptions = {
    info: {
      title: 'Backrub API Documentation',
      version: Pack.version
    },
    documentationPath: '/',
    basePath: '/'
  };

  await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: swaggerOptions
    }
  ]);

  server.route({
    method: 'POST',
    path: '/user',
    options: {
      validate: {
        payload: Joi.object({
          firstname: Joi.string().required(),
          lastname: Joi.string().required()
        }),
        failAction: (request, h, error) => {
          return error.isJoi
            ? h.response(error.details[0]).takeover()
            : h.response(error).takeover();
        }
      },
      tags: ['api']
    },
    handler: async (request, h) => {
      try {
        var user = new UserModel(request.payload);
        var result = await user.save();
        return h.response(result);
      } catch (error) {
        return h.response(error).code(500);
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/user',
    options: {
      tags: ['api']
    },
    handler: async (request, h) => {
      try {
        var user = await UserModel.find().exec();
        return h.response(user);
      } catch (error) {
        return h.response(error).code(500);
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/user/{id}',
    options: {
      validate: {
        query: {id: Joi.string()}
      },
      tags: ['api']
    },
    config: {
      handler: async (request, h) => {
        try {
          var user = await UserModel.findById(request.params.id).exec();
          return h.response(user);
        } catch (error) {
          return h.response(error).code(500);
        }
      }
    }
    
  });

  server.route({
    method: 'PUT',
    path: '/user/{id}',
    options: {
      validate: {
        payload: Joi.object({
          firstname: Joi.string().optional(),
          lastname: Joi.string().optional()
        }),
        failAction: (request, h, error) => {
          return error.isJoi
            ? h.response(error.details[0]).takeover()
            : h.response(error).takeover();
        }
      },
      tags: ['api']
    },
    handler: async (request, h) => {
      try {
        var result = await UserModel.findByIdAndUpdate(
          request.params.id,
          request.payload,
          { new: true }
        );
        return h.response(result);
      } catch (error) {
        return h.response(error).code(500);
      }
    }
  });

  try {
    await server.start();
    console.log('Server running on %s', server.info.uri);
  } catch (err) {
    console.log(err);
  }
};

process.on('unhandledRejection', err => {
  console.log(err);
  process.exit(1);
});

init();
