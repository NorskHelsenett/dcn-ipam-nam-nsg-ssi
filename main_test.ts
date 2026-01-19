/**
 * Test suite for IPAM-NAM-NSG-SSI
 * Tests utility functions, mappers, and service logic
 */

import { assertEquals, assertExists } from "@std/assert";
import { EnvLoader } from "@norskhelsenett/zeniki";
import { SSIWorker } from "./ssi/ssi.worker.ts";

const SECRETS_PATH = Deno.env.get("SECRETS_PATH") ?? undefined;
const CONFIG_PATH = Deno.env.get("CONFIG_PATH") ?? undefined;

new EnvLoader(SECRETS_PATH, CONFIG_PATH);

// ============================================================================
// Utility Function Tests
// ============================================================================

// ============================================================================
// Environment Variable Tests
// ============================================================================
if (Deno.args[0] === "e2e") {
  Deno.test("Environment: should have required config variables", () => {
    // These should be set from config.yaml or environment
    const NAM_URL = Deno.env.get("NAM_URL");
    const NAM_TOKEN = Deno.env.get("NAM_TOKEN");
    const IPAM_URL = Deno.env.get("IPAM_URL");
    const IPAM_TOKEN = Deno.env.get("IPAM_TOKEN");
    const SSI_NAME = Deno.env.get("SSI_NAME");
    const SSI_INTERVAL = Deno.env.get("SSI_INTERVAL");

    assertExists(NAM_URL);
    assertExists(NAM_TOKEN);
    assertExists(IPAM_URL);
    assertExists(IPAM_TOKEN);
    assertExists(SSI_NAME);
    assertExists(SSI_INTERVAL);
  });

  Deno.test("Environment: should have CRON_MODE variable", () => {
    const CRON_MODE = Deno.env.get("CRON_MODE");
    // CRON_MODE can be undefined, "true", or "false"
    // Just verify it's a valid value if set
    if (CRON_MODE !== undefined) {
      assertEquals(["true", "false"].includes(CRON_MODE), true);
    }
  });

  Deno.test("Environment: should have timeout configuration", () => {
    const REQUEST_TIMEOUT = Deno.env.get("REQUEST_TIMEOUT");
    if (REQUEST_TIMEOUT) {
      const timeout = parseInt(REQUEST_TIMEOUT);
      assertEquals(typeof timeout, "number");
      assertEquals(timeout > 0, true);
    }
  });

  // ============================================================================
  // Integration Tests (E2E - requires actual API access)
  // ============================================================================

  Deno.test(
    "SSIWorker: should initialize correctly with NAM credentials",
    () => {
      const NAM_URL = Deno.env.get("NAM_URL");
      const NAM_TOKEN = Deno.env.get("NAM_TOKEN");

      assertExists(NAM_URL);
      assertExists(NAM_TOKEN);
      const worker = new SSIWorker();
      assertEquals(worker.isRunning, false);
    },
  );

  Deno.test(
    "SSIWorker: should initialize correctly with IPAM credentials",
    () => {
      const IPAM_URL = Deno.env.get("IPAM_URL");
      const IPAM_TOKEN = Deno.env.get("IPAM_TOKEN");

      assertExists(IPAM_URL);
      assertExists(IPAM_TOKEN);
      const worker = new SSIWorker();
      assertEquals(worker.isRunning, false);
    },
  );

  Deno.test(
    "SSIWorker: should complete work execution successfully",
    async () => {
      const NAM_URL = Deno.env.get("NAM_URL");
      const NAM_TOKEN = Deno.env.get("NAM_TOKEN");
      assertExists(NAM_URL);
      assertExists(NAM_TOKEN);

      const worker = new SSIWorker();
      const result = await worker.work();
      assertEquals(result, 0); // Should return 0 on success
      assertEquals(worker.isRunning, false); // Should be false after completion
    },
  );
}
