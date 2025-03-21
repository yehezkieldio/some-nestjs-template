import { Test, TestingModule } from "@nestjs/testing";

import { AppController } from "./app.controller";

describe("AppController", () => {
    let appController: AppController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: []
        }).compile();

        appController = app.get<AppController>(AppController);
    });

    describe("root", () => {
        it('should return {"status":"ok"}', (): void => {
            expect(appController.getHealthCheck()).toEqual({ status: "ok" });
        });
    });
});
