export const restrictTrackerProtocol = (trackers: string[], allow: string[]) => {
    return trackers.filter((tracker) => {
        const url = new URL(tracker);
        return allow.includes(url.protocol);
    });
}