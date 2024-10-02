# NEX Hotel

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

Install the project dependencies and build up the DB container:

```bash
npm install
docker-compose up -d
```

Then, apply the migrations:

```bash
npx knex migrate:latest
```

> Note: In order to connect into a database container, use:
>
> ```bash
> psql -U nexadmin -d nexhotel
> ```

## Compile and run the project

```bash
npm run build

# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

`docker run --name postgres-nexhotel -e POSTGRES_USER=nexadmin -e POSTGRES_PASSWORD=1234567 -e POSTGRES_DB=nexhotel -p 5432:5432 -d postgres`
`npm run start:dev`
`npx knex migrate:latest`
`docker run -d --name camunda -p 8080:8080 camunda/camunda-bpm-platform:latest`
`curl -X POST \
  http://localhost:8080/engine-rest/deployment/create \
  -F "deployment-name=DynamicRoomPricing" \
  -F "enable-duplicate-filtering=true" \
  -F "DynamicRoomPricing.dmn=@rules/DynamicRoomPricing.dmn"`
`GET http://localhost:8080/engine-rest/decision-definition`
`POST http://localhost:8080/engine-rest/decision-definition/key/Decision_056hkp1/evaluate
Content-Type: application/json

{
  "variables": {
    "RoomType": { "value": "Junior Suite", "type": "String" },
    "Days": { "value": 5, "type": "Integer" },
    "IsWeekend": { "value": false, "type": "Boolean" },
    "Availability": { "value": 85, "type": "Integer" }
  }
}`
