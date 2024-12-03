import ytdl from '@distube/ytdl-core';

export interface CachedMusicInfo {
    u: string;  // url
    n: string;  // name
}

export class MusicInfo {
    constructor(public url: string, public title: string, public likes: number, public viewCount: number, public playCounter: number = 0) { }

    static fromDetails(info: ytdl.videoInfo) {
        const detail: ytdl.MoreVideoDetails = info.videoDetails;
        if (!detail.videoId) return null;
        const url = `https://www.youtube.com/watch?v=${detail.videoId}`;
        const title = detail.title || "";
        const viewCount = parseInt(detail.viewCount) || 0;
        const likes = detail.likes || 0;
        return new MusicInfo(url, title, likes, Number(viewCount));
    }

    static fromCache(info: CachedMusicInfo) {
        return new MusicInfo(info.u, info.n, 0, 0);
    }
}