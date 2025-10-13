// GitHub API integration for bug reports
const axios = require("axios");
require("dotenv").config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "Hermit-commits-code";
const REPO_NAME = "QuickTaskCreator";

async function createGithubIssue(title, body) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": "QuickTaskCreator-App",
  };
  const data = {
    title,
    body,
  };
  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    throw error;
  }
}

module.exports = { createGithubIssue };
