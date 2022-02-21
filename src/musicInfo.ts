import ytdl from 'ytdl-core';

export class MusicInfo {
    ytdlInfo: ytdl.videoInfo;
    url: string;
    title: string;
    likes: number;
    viewCount: number;

    constructor(ytdlInfo: ytdl.videoInfo, url: string, title: string, likes: number, viewCount: number) {
        this.ytdlInfo = ytdlInfo;
        this.url = url;
        this.title = title;
        this.likes = likes;
        this.viewCount = viewCount;
    }

    static fromDetails(ytdlInfo: ytdl.videoInfo) {
        let detail: ytdl.MoreVideoDetails = ytdlInfo.videoDetails;
        if (!detail.videoId) return null;
        let url = `https://www.youtube.com/watch?v=${detail.videoId}`;
        let title = detail.title || "";
        let viewCount = detail.viewCount || -1;
        let likes = detail.likes || -1;
        return new MusicInfo(ytdlInfo, url, title, likes, Number(viewCount));
    }
}