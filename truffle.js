module.exports = {
  build: "node ./postIntro.js",
  networks: {
  development: {
    host: "localhost",
    port: 8545,
    network_id: "*"
  }
  }
};
