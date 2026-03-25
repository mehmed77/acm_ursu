/**
 * Monaco Editor ni CDN dan emas, local bundle dan yuklatish.
 * Web Workers orqali ishlaydi — CSP unsafe-eval talab qilmaydi.
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'json')                                        return new jsonWorker();
        if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
        if (label === 'html' || label === 'handlebars')              return new htmlWorker();
        if (label === 'typescript' || label === 'javascript')        return new tsWorker();
        return new editorWorker();
    },
};

// @monaco-editor/react ga CDN o'rniga local monaco ishlatishni aytamiz
loader.config({ monaco });
