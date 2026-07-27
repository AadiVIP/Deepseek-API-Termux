const fs = require('fs');
const path = require('path');

const WASM_PATH = path.join(__dirname, 'sha3_wasm_bg.wasm');
const wasmBuffer = fs.readFileSync(WASM_PATH);
const wasmModule = new WebAssembly.Module(wasmBuffer);
const wasmInstance = new WebAssembly.Instance(wasmModule, {});
const wasmExports = wasmInstance.exports;

function solvePow(challenge, prefix, difficulty) {
  const memory = wasmExports.memory;
  const malloc = wasmExports.__wbindgen_export_0;
  const addToStack = wasmExports.__wbindgen_add_to_stack_pointer;
  const wasmSolve = wasmExports.wasm_solve;

  function writeStr(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const ptr = malloc(bytes.length, 1);
    new Uint8Array(memory.buffer, ptr, bytes.length).set(bytes);
    return [ptr, bytes.length];
  }

  const retptr = addToStack(-16);
  try {
    const [cPtr, cLen] = writeStr(challenge);
    const [pPtr, pLen] = writeStr(prefix);
    wasmSolve(retptr, cPtr, cLen, pPtr, pLen, difficulty);
    const view = new DataView(memory.buffer, retptr, 16);
    const status = view.getInt32(0, true);
    const value = view.getFloat64(8, true);
    if (status === 0) return null;
    return Math.floor(value);
  } finally {
    addToStack(16);
  }
}

let inputStr = '';
process.stdin.on('data', chunk => { inputStr += chunk; });
process.stdin.on('end', () => {
  try {
    const challenge = JSON.parse(inputStr.trim());
    const prefix = `${challenge.salt}_${challenge.expire_at}_`;
    const answer = solvePow(challenge.challenge, prefix, challenge.difficulty);
    if (answer === null) {
      console.error('PoW solver returned no answer');
      process.exit(1);
    }
    const payload = {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      salt: challenge.salt,
      answer: answer,
      signature: challenge.signature,
      target_path: challenge.target_path
    };
    const jsonStr = JSON.stringify(payload);
    const b64 = Buffer.from(jsonStr, 'utf-8').toString('base64');
    console.log(b64);
  } catch (e) {
    console.error(`[pow-helper] Error: ${e.message}`);
    process.exit(1);
  }
});
