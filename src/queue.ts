import { MusicInfo } from './musicInfo';
const {messages} = require('./language.json');

export class Queue {
    private _list: Array<MusicInfo>;
    private _index: number;

    constructor() {
        this._list = [];
        this._index = 0;
    }

    get list(): Array<MusicInfo> {
        return this._list;
    }

    get len(): number {
        return this._list.length;
    }

    get current(): MusicInfo {
        return this._list[this._index];
    }

    _genericIndex(index: number) {
        index = index % this.len;
        return (index < 0) ? index + this.len : index;
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
    // @return true if success vice versa.
    remove(index: number, isNowPlaying: boolean): boolean {
        index = this._genericIndex(index);
        if (index == this._index && isNowPlaying) return false;
        if (index <= this._index) {
            this._index--;
        }
        this._list.splice(index, 1);
        return true;
    }

    removeDuplicate(){
        let set = new Set<string>(); // set of urls
        let newList = new Array<MusicInfo>();
        let newIndex = 0;
        for(let i=0; i<this._list.length; i++){
            if(!set.has(this._list[i].url)){
                newList.push(this._list[i]);
                set.add(this._list[i].url);
                if(this._list[this._index].url == this._list[i].url){
                    newIndex = i;
                }
            }
        }
        this._list = newList;
        this._index = newIndex;
    }

    removeAll(){
        this._list = [];
    }

    sort(){
        this.list.sort((a, b) => {
            return a.title.localeCompare(b.title)
        });
    }

    shuffle() {
        for (let i = 0; i < this.len; i++) {
            let j = ~~(Math.random() * i);
            if (i != j && i != this._index && j != this._index) {
                // swap i and j
                let tmp = this._list[i]
                this._list[i] = this._list[j]
                this._list[j] = tmp
            }
        }
    }

    // showList() returns the list all elements in this queue
    showList(lang: string): string {
        if (this.isEmpty()) {
            return messages.no_playlist[lang];
        }
        let content = '';
        for (const [index, info] of this._list.entries()) {
            if (index == this._index) {
                content += `**${index}.\t${info.title}**\n`;
            } else {
                content += `${index}.\t${info.title}\n`;
            }
        }
        return content;
    }
}