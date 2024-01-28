import { MusicInfo } from './musicInfo';
import { messages } from './language.json';
import {
    ButtonBuilder,
    ButtonStyle,
    MessageEditOptions,
    Options,
    ActionRowBuilder,
} from 'discord.js';

const entriesOfOnePage = 30;

interface langMap {
    [key: string]: string;
}

export class Queue {
    private _list: Array<MusicInfo>;
    private _index: number;
    private _searchResult: Array<number>;
    private _searchQuery: RegExp | null;

    constructor() {
        this._list = [];
        this._searchResult = [];
        this._index = 0;
        this._searchQuery = null;
    }

    get list(): Array<MusicInfo> {
        return this._list;
    }

    get len(): number {
        return this._list.length;
    }

    // return the current music info
    get current(): MusicInfo {
        return this._list[this._index];
    }

    // return current page
    get page(): number {
        return Math.floor(this._index / entriesOfOnePage);
    }

    // return the number of pages
    get pages(): number {
        return Math.ceil(this.len / entriesOfOnePage);
    }

    private _genericIndex(index: number) {
        if (this.len === 0) return 0;
        index = index % this.len;
        return (index < 0) ? index + this.len : index;
    }

    genericPage(page: number) {
        if (this.pages === 0) return 0;
        page = page % this.pages;
        return (page < 0) ? page + this.pages : page;
    }

    isEmpty(): boolean {
        return this.len === 0;
    }

    add(info: MusicInfo) {
        this._list.push(info);
    }

    next(num: number) {
        return this.jump(this._index + num);
    }

    // @param index can be any integer.
    jump(index: number) {
        if (this.isEmpty()) return;
        this._index = this._genericIndex(index);
    }

    // @param index can be any integer.
    // @return true if success, vice versa.
    remove(index: number, isNowPlaying: boolean): boolean {
        index = this._genericIndex(index);
        if (index == this._index && isNowPlaying) return false;
        if (index <= this._index && this._index > 0) {
            this._index--;
        }
        this._list.splice(index, 1);
        return true;
    }

    swap(index1: number, index2: number) {
        index1 = this._genericIndex(index1);
        index2 = this._genericIndex(index2);
        if (index1 == index2) return;
        if (index1 == this._index) this._index = index2;
        if (index2 == this._index) this._index = index1;
        let tmp = this._list[index1];
        this._list[index1] = this._list[index2];
        this._list[index2] = tmp;
    }

    removeDuplicate() {
        let set = new Set<string>(); // set of urls
        let newList = new Array<MusicInfo>();
        let newIndex = 0;
        for (let i = 0; i < this.len; i++) {
            if (!set.has(this._list[i].url)) {
                newList.push(this._list[i]);
                set.add(this._list[i].url);
                if (this._list[this._index].url == this._list[i].url) {
                    newIndex = i;
                }
            }
        }
        this._list = newList;
        this._index = newIndex;
    }

    search(query: RegExp | null) {
        this._searchResult.length = 0;
        if (query !== null) {
            this._searchQuery = query;
        } else {
            query = this._searchQuery;
        }
        if (query === null) return;
        for (let i = 0; i < this.len; i++) {
            if (this._list[i].title.match(query)) {
                this._searchResult.push(i);
            }
        }
    }

    removeAll() {
        this._list = new Array<MusicInfo>();
        this._index = 0;
    }

    // O(nLgN + n)
    sort() {
        const currentURL = this._list[this._index].url;
        this._list.sort((a, b) => {
            return a.title.localeCompare(b.title);
        });
        // fix current index after sorting
        for (let i = 0; i < this.len; i++) {
            if (this._list[i].url == currentURL) {
                this._index = i;
                break;
            }
        }
    }

    // O(2n)
    shuffle() {
        const currentURL = this._list[this._index].url;
        // Knuth shuffle algorithm
        for (let i = 0; i < this.len; i++) {
            let j = ~~(Math.random() * i);
            // swap i and j
            let tmp = this._list[i];
            this._list[i] = this._list[j];
            this._list[j] = tmp;
        }
        // fix current index after shuffling
        for (let i = 0; i < this.len; i++) {
            if (this._list[i].url == currentURL) {
                this._index = i;
                break;
            }
        }
    }

    private showListByPage(lang: string, page: number, isShowSearchList: boolean = false): string {
        let content = '```yaml\n';
        const pages = isShowSearchList ? Math.ceil(this._searchResult.length / entriesOfOnePage) : this.pages;
        content += `page:\t${page}/${Math.max(pages, 1) - 1}\n`;
        if (this.isEmpty() || (isShowSearchList && this._searchResult.length === 0)) {
            content += (messages.playlist_is_empty as langMap)[lang];
        }

        let len = isShowSearchList ? this._searchResult.length : this.len;
        for (let i = page * entriesOfOnePage; i < Math.min((page + 1) * entriesOfOnePage, len); i++) {
            let j = isShowSearchList ? this._searchResult[i] : i;
            if (j == this._index) {
                content += '>' + `${j}`.padStart(3, ' ') + `:\t${this._list[j].title}\n`;
            } else {
                content += `${j}`.padStart(4, ' ') + `:\t${this._list[j].title}\n`;
            }
        }
        return content + '\n```';
    }

    showList(lang: string, page?: number | undefined, isShowSearchList: boolean = false): MessageEditOptions | Options {
        page = page ?? Math.floor(this._index / entriesOfOnePage);
        const btnNext = new ButtonBuilder()
            .setCustomId(!isShowSearchList ? `next-${page}` : `nextSearch-${page}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary);
        const btnPre = new ButtonBuilder()
            .setCustomId(!isShowSearchList ? `pre-${page}` : `preSearch-${page}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary);
        const btnRefresh = new ButtonBuilder()
            .setCustomId(!isShowSearchList ? 'refresh' : 'refreshSearch')
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Secondary);

        return {
            content: this.showListByPage(lang, page, isShowSearchList),
            components: [new ActionRowBuilder()
                .addComponents(btnPre)
                .addComponents(btnRefresh)
                .addComponents(btnNext)
            ]
        };
    }

    toList(): any[] {
        var ret: any[] = [];
        this._list.forEach((music) => {
            ret.push({
                url: music.url,
                title: music.title,
                likes: music.likes,
                viewCount: music.viewCount,
                playCounter: music.playCounter
            });
        });
        return ret;
    }
}