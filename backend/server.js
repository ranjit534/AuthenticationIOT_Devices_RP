const express = require("express");
const { Web3 } = require("web3");
const fs = require("fs");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
const port = 3001;

const web3 = new Web3("http://127.0.0.1:7545");
const abi = JSON.parse(
  fs.readFileSync("../build/contracts/DeviceRegistry.json", "utf-8")
);

const deviceRegistry = new web3.eth.Contract(
  abi.abi,
  "0x9C434acc62F0FfCF371d6f71Bf84fA2D178CC674"
);

app.use(express.json());

function generateKey(length = 16) {
  //For a random key generation that will be used in CRT
  return crypto.randomBytes(length);
}

function hash(data) {
  //SHA256 hashing
  const sha256 = crypto.createHash("sha256");
  sha256.update(data);
  return sha256.digest();
}

function generatePseudoIdentity(realIdentity, p1, q1) {
  //CRT(Chinese remainder theorem) for generating pseudo identity
  const r = generateKey();
  const p = BigInt(p1),
    q = BigInt(q1);
  // Converted random bytes to a BigInt
  const rBigInt = BigInt("0x" + r.toString("hex"));

  // Converted realIdentity to BigInt
  const realIdentityBigInt = BigInt(
    "0x" + Buffer.from(realIdentity).toString("hex")
  );

  const pidP = (rBigInt ^ realIdentityBigInt) % (p * q);
  const pidQ = (rBigInt ^ realIdentityBigInt) % (p * q);

  const qInverse = modInverse(q, p);
  const cp = (q * BigInt(qInverse % p)) % (p * q);
  const cq = (p * BigInt(modInverse(p, q) % q)) % (p * q);

  //Final pseudo identity-(pid)
  const pid = (pidP * cp + pidQ * cq) % (p * q);

  // Converted BigInt pid back to Buffer
  const pidBuffer = Buffer.from(pid.toString(16), "hex");

  return pidBuffer;
}

// Function to calculate the modular inverse using the extended Euclidean algorithm
function modInverse(a, m) {
  let m0 = m;
  let x0 = 0n;
  let x1 = 1n;
  while (a > 1n) {
    const q = a / m;
    let t = m;
    m = a % m;
    a = t;
    t = x0;
    x0 = x1 - q * x0;
    x1 = t;
  }
  if (x1 < 0n) {
    x1 += m0;
  }
  return x1;
}

function generateSecretKey(pid) {
  return hash(pid);
}

function authenticate(pid, pufModel, macAddress) {
  //Authenticate function when pid,pufmodel and macAddress is availiable
  const challenge1 = generateKey();
  const challenge2 = generateKey();

  const h1 = hash(Buffer.concat([challenge1, challenge2, pid]));

  const minerResponse = minerVerification(
    pid,
    pufModel,
    macAddress,
    challenge1,
    challenge2,
    h1
  );

  if (minerResponse) {
    console.log("Authentication successful");
  } else {
    console.log("Authentication failed");
  }
}

function minerVerification( //Function for miner verification
  pid,
  pufModel,
  macAddress,
  challenge1,
  challenge2,
  h1
) {
  // Miner verification logic to Verify Pid, PUFModel, and MAC address when availiable

  // Compute response
  const c1 = Buffer.concat([
    challenge1,
    hash(Buffer.concat([challenge1, pid])),
  ]);
  const c2 = Buffer.concat([
    challenge2,
    hash(Buffer.concat([challenge2, pid])),
  ]);

  const [R1, R2] = pufModel(c1, c2);
  return true; // For simplicity, always return true in this example
}

app.post("/register", async (req, res) => {
  const { deviceId, realId } = req.body;

  const Pid = generatePseudoIdentity(realId, 107n, 113n);
  const accounts = await web3.eth.getAccounts();
  const result = await deviceRegistry.methods
    .registerDevice(deviceId, Pid)
    .send({ from: accounts[0], gas: 3000000, gasPrice: "20000000000" });

  res.json({ success: true, transactionHash: result.transactionHash });
});

app.post("/authenticate", async (req, res) => {
  const { deviceId, realId } = req.body;
  const Pid = generatePseudoIdentity(realId, 107n, 113n);
  const accounts = await web3.eth.getAccounts();
  const result = await deviceRegistry.methods
    .authenticateDevice(deviceId, Pid)
    .send({ from: accounts[0], gas: 3000000, gasPrice: "20000000000" });

  // Assuming we have a PUFModel and MAC address
  const pufModel = (c1, c2) => [generateKey(), generateKey()];
  const macVerification = true;

  authenticate(Buffer.from(Pid), pufModel, macVerification);

  res.json({ success: true, transactionHash: result.transactionHash });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
