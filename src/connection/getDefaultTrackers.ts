import { Context } from "hono";

export const getDefaultTrackers = (c: Context) => { 
    return c.env["DEFAULT_TRACKERS"]?.split(",") || [];
};