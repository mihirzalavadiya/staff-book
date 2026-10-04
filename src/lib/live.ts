/**
 * Live updates. When something is saved, the server rings a bell on the
 * channels of everyone who can see it; their screens then reload the data
 * from our own server. The bell carries no data, only "something changed",
 * and channel names are unguessable ids.
 */
export const LIVE_EVENT = "changed";

export const householdTopic = (householdId: string) => `sb-household-${householdId}`;
export const workerTopic = (workerId: string) => `sb-worker-${workerId}`;
