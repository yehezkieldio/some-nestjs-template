import type { INestApplication } from "@nestjs/common";
import type { App } from "supertest/types";

import { Test, type TestingModule } from "@nestjs/testing";
import { AppModule } from "#/app.module";
import request from "supertest";

describe("AppController (e2e)", () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it("/health (GET)", () => {
        return request(app.getHttpServer()).get("/health").expect(200).expect({
            status: "ok",
        });
    });
});
