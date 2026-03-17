"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const promises_1 = __importDefault(require("node:fs/promises"));
const body_parser_1 = __importDefault(require("body-parser"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
function paginate(items, page, size) {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / size);
    const currentPage = Math.min(Math.max(page, 1), totalPages || 1);
    const data = items.slice((currentPage - 1) * size, currentPage * size);
    return {
        data,
        meta: { currentPage, size, totalItems, totalPages }
    };
}
function parsePageParams(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(query.size) || 10));
    return { page, size };
}
app.use(body_parser_1.default.json());
// CORS
app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.get("/", (_req, res) => {
    res.send("Express + TypeScript Server");
});
// GET /api/works?page=1&size=10&title=developer&company_name=BNI
app.get('/api/works', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fileContent = yield promises_1.default.readFile(path_1.default.join(process.cwd(), '/data/works.json'), 'utf8');
        let data = JSON.parse(fileContent);
        const { title, company_name } = req.query;
        if (title)
            data = data.filter(w => w.title.toLowerCase().includes(title.toLowerCase()));
        if (company_name)
            data = data.filter(w => w.company_name.toLowerCase().includes(company_name.toLowerCase()));
        const { page, size } = parsePageParams(req.query);
        res.status(200).json(paginate(data, page, size));
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to load works data' });
    }
}));
// GET /api/portfolio?page=1&size=10&highlight=true&year=2024&client=BNI&tags=React
app.get('/api/portfolio', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fileContent = yield promises_1.default.readFile(path_1.default.join(process.cwd(), '/data/portfolio.json'), 'utf8');
        let data = JSON.parse(fileContent);
        const { highlight, year, client, tags } = req.query;
        if (highlight !== undefined)
            data = data.filter(p => p.highlight === (highlight === 'true'));
        if (year)
            data = data.filter(p => p.year.includes(year));
        if (client)
            data = data.filter(p => p.client.toLowerCase().includes(client.toLowerCase()));
        if (tags)
            data = data.filter(p => p.tags.toLowerCase().includes(tags.toLowerCase()));
        const { page, size } = parsePageParams(req.query);
        res.status(200).json(paginate(data, page, size));
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to load portfolio data' });
    }
}));
// GET /api/portfolio/highlights?page=1&size=10
app.get('/api/portfolio/highlights', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fileContent = yield promises_1.default.readFile(path_1.default.join(process.cwd(), '/data/portfolio.json'), 'utf8');
        const data = JSON.parse(fileContent).filter(p => p.highlight);
        const { page, size } = parsePageParams(req.query);
        res.status(200).json(paginate(data, page, size));
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to load portfolio data' });
    }
}));
// GET /api/site — no pagination, single config object
app.get('/api/site', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fileContent = yield promises_1.default.readFile(path_1.default.join(process.cwd(), '/data/site.json'), 'utf8');
        const siteData = JSON.parse(fileContent);
        res.status(200).json({ data: siteData });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to load site data' });
    }
}));
// For local dev
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });
}
exports.default = app;
