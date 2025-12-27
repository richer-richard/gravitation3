/* eslint-disable no-console */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { TrainingDataGenerator } = require('../scripts/generate_training_data');

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitation3-'));
  const outputPath = path.join(tmpDir, 'dataset.json');

  const generator = new TrainingDataGenerator('three-body', { verbose: false });

  const samples = await generator.generate(10);
  assert.ok(Array.isArray(samples), 'samples should be an array');
  assert.strictEqual(samples.length, 10, 'should generate requested number of samples');

  for (const sample of samples) {
    assert.ok(sample, 'sample should be defined');
    assert.ok(Array.isArray(sample.features), 'sample.features should be an array');
    assert.ok(typeof sample.label === 'string', 'sample.label should be a string');
    assert.ok(sample.metadata && typeof sample.metadata === 'object', 'sample.metadata should exist');
  }

  const dataset = await generator.saveDataset(samples, outputPath, { append: false, merge: false });
  assert.ok(fs.existsSync(outputPath), 'dataset file should exist');

  const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.strictEqual(parsed.simulatorType, 'three-body');
  assert.ok(Array.isArray(parsed.samples));
  assert.strictEqual(parsed.samples.length, 10);

  assert.ok(parsed.datasetInfo && typeof parsed.datasetInfo === 'object');
  assert.ok(parsed.weighting && typeof parsed.weighting === 'object');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('✅ tests/test_data_generation.js passed');
}

run().catch((err) => {
  console.error('❌ tests/test_data_generation.js failed');
  console.error(err);
  process.exitCode = 1;
});

