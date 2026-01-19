/**
 * SSI Worker - Main orchestration class for SSI operations
 * Manages sync operations between IPAM and NAM
 */

import { NAMv2Driver, NetboxDriver } from "@norskhelsenett/zeniki";
import https from "node:https";
import packageInfo from "../deno.json" with { type: "json" };
import logger from "./loggers/logger.ts";
import {
  processConsumerGroups,
  processEnvironmentGroups,
} from "./ssi.utils.ts";

const SSI_NAME = Deno.env.get("SSI_NAME") ?? "SSI_NAME_MISSING";
const USER_AGENT = `${SSI_NAME}/${packageInfo.version}`;
Deno.env.set("USER_AGENT", USER_AGENT);
const REQUEST_TIMEOUT = Deno.env.get("REQUEST_TIMEOUT")
  ? parseInt(Deno.env.get("REQUEST_TIMEOUT") as string)
  : 10000;

const _HTTPS_AGENT = new https.Agent({
  rejectUnauthorized: Deno.env.get("DENO_ENV")! != "development", // Set to false to disable certificate verification
  keepAlive: true,
  timeout: REQUEST_TIMEOUT,
});

const NAM_URL = Deno.env.get("NAM_URL");
const NAM_TOKEN = Deno.env.get("NAM_TOKEN");
const IPAM_URL = Deno.env.get("IPAM_URL");
const IPAM_TOKEN = Deno.env.get("IPAM_TOKEN");

/**
 * Main worker class that orchestrates IPAM to NAM synchronization
 * Initializes API drivers and coordinates deployment to NAM
 */
export class SSIWorker {
  private _running: boolean = false;
  private static _nms: NAMv2Driver;
  private static _ipam: NetboxDriver;
  private _run_counter = 0;

  /**
   * Initializes the worker and sets up the NAM API driver
   */
  constructor() {
    if (!SSIWorker._nms && NAM_URL) {
      SSIWorker._nms = new NAMv2Driver({
        baseURL: NAM_URL,
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
          Authorization: `Bearer ${NAM_TOKEN}`,
        },
        // TODO: Figure out proper timeout, signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
    }
    if (!SSIWorker._ipam && IPAM_URL) {
      SSIWorker._ipam = new NetboxDriver({
        baseURL: IPAM_URL,
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
          Authorization: `Token ${IPAM_TOKEN}`,
        },
        // TODO: Figure out proper timeout, signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
    }
  }

  get isRunning(): boolean {
    return this._running;
  }

  /**
   * Main work method that performs synchronization tasks
   * Fetches data from IPAM and deploys to NAM
   */
  public async work() {
    try {
      if (!this.isRunning) {
        this._running = true;
        logger.debug("ipam-nam-nsg-ssi: Worker running task...");

        const ipam = SSIWorker._ipam;
        const nam = SSIWorker._nms;

        await processConsumerGroups(nam, ipam);
        await processEnvironmentGroups(nam, ipam);

        this._running = false;
        this._run_counter += 1;
        logger.debug("ipam-nam-nsg-ssi: Worker task completed...", {
          component: "worker",
          method: "work",
        });
        // This shall be a console log, as we´re only interested in number of runs completed, and not logging them.
        console.log(
          `ipam-nam-nsg-ssi: Completed run number ${this._run_counter}`,
        );
        return 0;
      } else {
        logger.warning("ipam-nam-nsg-ssi: Worker task already running...", {
          component: "worker",
          method: "work",
        });
        return 7;
      }
    } catch (error: unknown) {
      this._running = false;
      throw error;
    }
  }
}
