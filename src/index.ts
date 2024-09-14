import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import fs from 'node:fs/promises';
import bodyParser from 'body-parser';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

interface Works {
  title: string, 
  company_name: string,
  location: string,
  time: string,
  job_desc: string
}

interface Portfolio {
  name: string, 
  tags: string,
  external_url: string,
  description: string,
  year: number,
  highlight: boolean,
  client: string,
  made_at: string
}

app.use(bodyParser.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.get('/api/works', async (req, res) => {
  const fileContent = await fs.readFile(process.cwd() + '/data/works.json', 'utf8');

  const worksData: Works[] = JSON.parse(fileContent.toString());

  res.status(200).json({ works: worksData });
});

app.get('/api/portfolio', async (req, res) => {
  const fileContent = await fs.readFile(process.cwd() + '/data/portfolio.json', 'utf8');

  const portfolioData: Portfolio[] = JSON.parse(fileContent.toString());

  res.status(200).json({ works: portfolioData });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});