"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = require("path");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, cookie_parser_1.default)());
    app.enableCors({
        origin: (origin, callback) => {
            callback(null, true);
        },
        credentials: true,
    });
    const rootDir = (0, path_1.join)(__dirname, '..', '..');
    app.useStaticAssets(rootDir);
    if (process.env.SUBPATH) {
        app.setGlobalPrefix(process.env.SUBPATH);
    }
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`NestJS server running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map