import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const publicDirectory = path.resolve(__dirname, "../../../public");

test("the editor links to the bundled guide", () => {
  const index = fs.readFileSync(path.join(publicDirectory, "index.html"), "utf8");

  assert.match(index, /href="\.\/guide\.html">使い方<\/a>/);
  assert.ok(fs.existsSync(path.join(publicDirectory, "guide.html")));
});

test("the guide includes the supplied editor screenshot", () => {
  const guide = fs.readFileSync(path.join(publicDirectory, "guide.html"), "utf8");
  const screenshot = path.join(publicDirectory, "images", "anemo-wind-field-editor.webp");

  assert.match(guide, /src="\/images\/anemo-wind-field-editor\.webp"/);
  assert.ok(fs.statSync(screenshot).size > 0);
});
