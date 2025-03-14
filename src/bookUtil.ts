import { ExtensionContext, workspace, window } from 'vscode';
import * as cheerio from 'cheerio';
import { fetch } from './utils/request';

let printPage = window.setStatusBarMessage

interface BookRule {
    chapterUrl: string;
    chapterItems: string;
    chapterList: string;
    chapterName: string;
    chapterCover: string;
    chapterLock: string;
    chapterTime: string;
    chapterResult: string;
    contentUrl: string;
    contentItems: string;
}

interface ChapterInfo {
    name: string;
    url: string;
}

interface Chapter{
    id: number;
    content: string;
}

export class Book {
    fetch_chapter_list_flag: boolean = false;
    chapter_list: ChapterInfo[] = [];
    curr_chapter_number: number = 1;

    fetch_chapter_flag: boolean = false;
    chapter: Chapter | null = null;
    curr_page_number: number = 1;
    page_size: number = 50;
    page_count: number = 0;

    get_page_flag: boolean = false;

    book_rule: BookRule;
    extensionContext: ExtensionContext;


    constructor(extensionContext: ExtensionContext) {
        this.extensionContext = extensionContext;
        this.book_rule = {
            "chapterUrl": "",
            "chapterItems": "",
            "chapterList": ".book-list > ul > li",
            "chapterName": "text",
            "chapterCover": "",
            "chapterLock": "",
            "chapterTime": "",
            "chapterResult": "a@href",
            "contentUrl": "",
            "contentItems": "#nr1@html",
        }
    }

    init() {
        const chapter_url = <string>workspace.getConfiguration().get('tReader.chapterUrl');
        const curr_chapter_number = <number>workspace.getConfiguration().get('tReader.currChapterNumber');
        if (
            this.book_rule.chapterUrl &&
            this.book_rule.chapterUrl == chapter_url &&
            this.chapter_list.length > 0 &&
            this.curr_chapter_number == curr_chapter_number
        ){
            return;
        }
        this.book_rule.chapterUrl = chapter_url;
        this.curr_chapter_number = curr_chapter_number;
        this.chapter_list = [];
        this.curr_page_number = <number>workspace.getConfiguration().get('tReader.currPageNumber');
        this.fetchChapterList().then(() => {
            if (1 <= this.curr_chapter_number && this.curr_chapter_number <= this.chapter_list.length){
                this.fetchChapter()
            }
        });
    }

    async fetchChapterList() {
        this.fetch_chapter_list_flag = true;
        this.fetch_chapter_flag = true;
        try {
            const response = await fetch(
                this.book_rule.chapterUrl,
                {
                    proxy: workspace.getConfiguration().get('tReader.proxy')
                }
            );
            const $ = cheerio.load(<string>response);
            const bookListItems = $(this.book_rule.chapterList);

            bookListItems.each((index, element) => {
                const name = $(element).text().trim();
                const href = $(element).find('a').attr('href');
                this.chapter_list.push({
                    name: name,
                    url: href!,
                });
            });
        } catch (error) {
            if (error instanceof Error) {
                console.error('GET Chapter List Error:', error.message);
            } else {
                console.error('GET Chapter List Error:', String(error));
            }
        } finally {
            this.fetch_chapter_list_flag = false;
            this.fetch_chapter_flag = false;
        }
    }

    async fetchChapter() {
        this.fetch_chapter_flag = true;
        try {
            if (this.chapter && this.curr_chapter_number == this.chapter.id){
                return;
            }
            const chapter_info = this.chapter_list[this.curr_chapter_number - 1]
            const response = await fetch(
                chapter_info.url,
                {
                    proxy: workspace.getConfiguration().get('tReader.proxy')
                }
            );
            const $ = cheerio.load(response);
            let content = <string>$('#nr1').text().trim(); // 提取 #nr1 元素的 TEXT 内容
            const line_break = <string>workspace.getConfiguration().get('tReader.lineBreak');
            content = content.toString().replace(/\n/g, line_break).replace(/\r/g, " ").replace(/　　/g, " ").replace(/ /g, " ");
            content = `[${chapter_info.name}]  ` + content
            this.chapter =  {
                id: this.curr_chapter_number,
                content: content,
            };
            this.getPageSize();
            this.getPageCount();
            this.updateChapterNumber();
        } catch (error) {
            if (error instanceof Error) {
                console.error('GET Chapter Error:', error.message);
            } else {
                console.error('GET Chapter Error:', String(error));
            }
        } finally {
            this.fetch_chapter_flag = false;
        }
    }

    getPageSize() {
        let page_size = <number>workspace.getConfiguration().get('tReader.pageSize');
        const is_english = <boolean>workspace.getConfiguration().get('tReader.isEnglish');

        if (page_size < 1){
            page_size = 50;
        }

        if (is_english === true) {
            this.page_size = page_size * 2;
        } else {
            this.page_size = page_size;
        }
    }

    getPageCount() {
        let size = (<Chapter>this.chapter).content.length;
        this.page_count = Math.ceil(size / this.page_size);
    }

    updateChapterNumber() {
        workspace.getConfiguration().update('tReader.currChapterNumber', this.curr_chapter_number, true);
    }

    updatePageNumber() {
        workspace.getConfiguration().update('tReader.currPageNumber', this.curr_page_number, true);
    }

    getPageContent() {
        if (this.fetch_chapter_flag){
            printPage('章节获取中...');
            return;
        }
        // 判断当前页数是否超出章节内容，
        // 如果超出章节内容，则切换章节
        if (this.curr_page_number > this.page_count){
            this.curr_chapter_number += 1
            if (this.curr_chapter_number > this.chapter_list.length){
                this.curr_chapter_number = this.chapter_list.length
                this.curr_page_number = this.page_count + 1
                this.updatePageNumber()
                printPage('无章节内容');
                return;
            }
            this.curr_page_number = 1
        } else if (this.curr_page_number < 1){
            this.curr_chapter_number -= 1
            if (this.curr_chapter_number < 1){
                this.curr_chapter_number = 1
                this.curr_page_number = 0
                this.updatePageNumber()
                printPage('无章节内容');
                return;
            }
        }
        this.get_page_flag = true;
        this.fetchChapter().then(() => {
            // 如果是上翻一页超出章节，则切换上一章后一页
            if (this.curr_page_number < 1) {
                this.curr_page_number = this.page_count
            }
            this.updatePageNumber()
            const start = (this.curr_page_number - 1) * this.page_size;
            const end = this.curr_page_number * this.page_size;
            printPage((<Chapter>this.chapter).content.substring(start, end));
            this.get_page_flag = false;
        });
    }

    getPreviousChapter() {
        if (this.get_page_flag){
            printPage('章节获取中...');
            return;
        }
        this.curr_chapter_number -= 1
        this.curr_page_number = 1
        this.getPageContent();
    }

    getNextChapter() {
        if (this.get_page_flag){
            printPage('章节获取中...');
            return;
        }
        this.curr_chapter_number += 1
        this.curr_page_number = 1
        this.getPageContent();
    }

    getPreviousPage() {
        if (this.get_page_flag){
            printPage('章节获取中...');
            return;
        }
        this.curr_page_number -= 1
        this.getPageContent();
    }

    getNextPage() {
        if (this.get_page_flag){
            printPage('章节获取中...');
            return;
        }
        this.curr_page_number += 1
        this.getPageContent();
    }

}