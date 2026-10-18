/**
 * Live updates. When something is saved, the server rings a bell on the
 * channels of everyone who can see it; their screens then reload the data
 * from our own server. The bell carries no data, only "something changed".
 * Channel names are secrets the server hands to each screen (see server/live).
 */
export const LIVE_EVENT = "changed";
