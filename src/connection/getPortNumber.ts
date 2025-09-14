import { Context } from "hono";

export const getPortNumber = (c: Context) => {
    return c.env.PORT || 6881;
}