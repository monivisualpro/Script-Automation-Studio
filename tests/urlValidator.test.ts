import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateOrReservedIp, validateSafeExternalUrl } from "../server/urlValidator.ts";

test("private / reserved IPv4 ranges are rejected", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255"]) {
    assert.equal(isPrivateOrReservedIp(ip), true, ip);
  }
});

test("public IPv4 is allowed, boundaries are exact", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "100.63.255.255", "100.128.0.1"]) {
    assert.equal(isPrivateOrReservedIp(ip), false, ip);
  }
});

test("malformed IPv4 is rejected", () => {
  assert.equal(isPrivateOrReservedIp("999.1.1.1"), true);
  assert.equal(isPrivateOrReservedIp("1.2.3"), true);
});

test("IPv6 loopback, ULA, link-local and mapped-private are rejected", () => {
  for (const ip of ["::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:7f00:1"]) {
    assert.equal(isPrivateOrReservedIp(ip), true, ip);
  }
});

test("validateSafeExternalUrl rejects bad schemes, credentials and local hosts", async () => {
  for (const url of [
    "",
    "not a url",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "ftp://example.com/x",
    "https://user:pass@example.com/",
    "http://localhost:3000/",
    "http://foo.localhost/",
    "http://metadata.google.internal/",
    "http://127.0.0.1/",
    "http://169.254.169.254/latest/meta-data",
    "http://2130706433/", // decimal form of 127.0.0.1 (URL parser normalises it)
    "http://0x7f.0.0.1/",
    "http://[::1]/", // IPv6 literal: hostname includes brackets
    "http://[fd00::1]/",
    "http://[::ffff:127.0.0.1]/",
    "https://example.com/" + "a".repeat(2100),
  ]) {
    const r = await validateSafeExternalUrl(url);
    assert.equal(r.valid, false, `should reject: ${url.slice(0, 60)}`);
  }
});
