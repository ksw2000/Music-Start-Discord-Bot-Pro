import ytdl from 'ytdl-core'

export class MusicInfo {
    url: string;
    title: string;
    likes: number;
    viewCount: number;
    playCounter: number;    // How many times the user played this song.

    constructor(url: string, title: string, likes: number, viewCount: number, playCounter: number = 0) {
        this.url = url;
        this.title = title;
        this.likes = likes;
        this.viewCount = viewCount;
        this.playCounter = playCounter;
    }

    static fromDetails(ytdlInfo: ytdl.videoInfo) {
        let detail: ytdl.MoreVideoDetails = ytdlInfo.videoDetails;
        if (!detail.videoId) return null;
        let url = `https://www.youtube.com/watch?v=${detail.videoId}`;
        let title = detail.title || "";
        let viewCount = detail.viewCount || -1;
        let likes = detail.likes || -1;
        return new MusicInfo(url, title, likes, Number(viewCount));
    }
}