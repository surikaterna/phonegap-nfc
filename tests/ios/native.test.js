const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "../..");

test("Core NFC sessions use alloc and their designated initializers", () => {
    const source = fs.readFileSync(path.join(root, "src/ios/NfcPlugin.m"), "utf8");
    assert.doesNotMatch(source, /\[(?:NFCNDEFReaderSession|NFCTagReaderSession)\s+new\]/);
    assert.equal((source.match(/\[\[NFCTagReaderSession alloc\]\s*initWithPollingOption:/g) || []).length, 2);
    assert.equal((source.match(/\[\[NFCNDEFReaderSession alloc\]\s*initWithDelegate:/g) || []).length, 3);
    assert.match(source, /\[NSMutableArray new\]/, "unrelated allocation remains unchanged");
});

test("both entitlement configurations default to TAG with an explicit legacy option", () => {
    const xml = fs.readFileSync(path.join(root, "plugin.xml"), "utf8");
    const ios = xml.match(/<platform name="ios">([\s\S]*?)<\/platform>/)[1];
    const defaultFormat = ios.match(/<preference name="IOS_NFC_READER_SESSION_FORMAT" default="([^"]+)"/)[1];
    assert.equal(defaultFormat, "TAG");
    const blocks = Array.from(ios.matchAll(/<config-file parent="com\.apple\.developer\.nfc\.readersession\.formats"[^>]*target="([^"]+)"[^>]*>([\s\S]*?)<\/config-file>/g));
    assert.equal(blocks.length, 2);
    assert.deepEqual(blocks.map(block => block[1]).sort(), ["*-Debug.plist", "*-Release.plist"]);
    for (const block of blocks) {
        assert.deepEqual(Array.from(block[2].matchAll(/<string>([^<]+)<\/string>/g), match => match[1]), ["$IOS_NFC_READER_SESSION_FORMAT"]);
        assert.match(block[2].replaceAll("$IOS_NFC_READER_SESSION_FORMAT", defaultFormat), /<string>TAG<\/string>/);
        assert.match(block[2].replaceAll("$IOS_NFC_READER_SESSION_FORMAT", "NDEF"), /<string>NDEF<\/string>/);
    }
    assert.doesNotMatch(ios, /parent="MinimumOSVersion"|name="deployment-target"/);
    assert.match(ios, /parent="NFCReaderUsageDescription"/);
    assert.match(ios, /framework src="CoreNFC.framework" weak="true"/);
});

test("native plugin compiles against current Cordova and Core NFC for iOS 16", {
    skip: process.platform !== "darwin" || !process.env.CORDOVA_IOS_HEADERS
}, t => {
    const sdk = spawnSync("xcrun", ["--sdk", "iphoneos", "--show-sdk-path"], { encoding: "utf8" });
    if (sdk.status !== 0) { t.skip("iPhoneOS SDK unavailable"); return; }
    const cache = fs.mkdtempSync(path.join(os.tmpdir(), "nfc-native-test-"));
    t.after(() => fs.rmSync(cache, { recursive: true, force: true }));
    const compile = spawnSync("xcrun", ["clang", "-fsyntax-only", "-fobjc-arc", "-fmodules", "-fblocks", "-target", "arm64-apple-ios16.0", "-isysroot", sdk.stdout.trim(), "-fmodules-cache-path=" + cache, "-I", process.env.CORDOVA_IOS_HEADERS, path.join(root, "src/ios/NfcPlugin.m")], { encoding: "utf8", timeout: 60000 });
    assert.equal(compile.status, 0, compile.stderr || String(compile.error));
});
