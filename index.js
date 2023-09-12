import { trim } from "lodash";

/**
 * @param {jsPDF} doc 
 */
function textMaxWidth(doc, text, maxWidth) {
    //TODO
    //this one will measure by char, breaking words
}

/**
 * Parses a string and returns a list of instructions (tokens) to draw the text in the document.
 * @param {string} text - Input text.
 * @returns {object[]}
 */
function parseFormattedText(text) {
    //Just **bold** for now

    let buffer = "",
        open = {
            bold: false
        },
        stack = [];

    text = text.replace(/(\r\n|\n\r)/g, "\n");

    for(let i = 0; i < text.length; i++) {
        if(text[i] == "*" && text[i + 1] == "*") {
            if(buffer)
                stack.push({ text: buffer });
            buffer = "";

            open.bold = !open.bold;
            stack.push({ bold: open.bold });

            i++; //skip next *
            continue;
        }

        if(text[i] == "\n") {
            if(buffer)
                stack.push({ text: buffer });
            buffer = "";
            stack.push({ br: true });
            continue;
        }

        if(text[i] == " ") {
            stack.push({ text: buffer + " " });
            buffer = "";
            continue;
        }

        buffer += text[i];
    }

    if(buffer)
        stack.push({ text: buffer });

    return stack;
}

/**
 * Creates a new textbox to be drawn on the provided jsPDF instance. The dimensions are computed immediately; call `draw()` to actually draw the text
 * on the page. All values are in the document's unit.
 * @param {jsPDF} doc - jsPDF instance.
 * @param {string} text - Text to draw.
 * @param {number} [options.startY] - Initial Y position. The default value is the top margin.
 * @param {(object|number)} [options.margin] - Page margins as a number (all margins will be equal), or as an object `{top, bottom, left, right}`.
 * @param {number} [options.width] - Width of the text box. By default, it's the page width minus margins.
 * @param {string} [options.baseline] - Baseline option for the jsPDF `text()` function (see jsPDF docs). By default, it's `top`.
 * @param {number} [options.numLines] - Limit the number of lines to be drawn.
 * @param {number} [options.maxHeight] - Maximum height. This will disable page breaks even if the value is greater than the available space in the page.
 * @param {boolean} [options.ellipsis] - Wether or not to add ellipsis if the text overflows the box.
 * @param {boolean} [options.lineBreak] - If `false`, lines won't break unless a `\n` is found. Default value is `true`.
 * @param {boolean} [options.pageBreak] - Wether or not to add new pages if necessary. Default value is `true`.
 * @param {boolean} [options.wordBreak] - Wether or not to break words. Default value is `false`.
 * @param {string} [options.textAlign] - Text align, as `"left"` (default), `"right"` or `"center"`.
 * @constructs {TextBox}
 */
export function textBox(doc, text, { startY = 0, margin, width, baseline = "top", numLines, maxHeight, ellipsis, lineBreak = true, pageBreak = true, wordBreak, textAlign = "left" }) {
    this.data = [];
    this.pages = 1;
    this.finalY = 0;
    this.finalHeight = 0;

    //TODO text align, break words
    //TODO columns
    //TODO justify text
    //TODO implement word break, if false, break anyways if not even one word can be fit in the total width

    const pageW = doc.internal.pageSize.getWidth(),
        pageH = doc.internal.pageSize.getHeight();

    if(typeof margin == "number")
        margin = {
            left: margin,
            top: margin,
            bottom: margin,
            right: margin
        };

    margin = {
        left: 0,
        top: 0,
        bottom: 0,
        right: 0,
        ...margin
    };

    if(!startY)
        startY = margin.top;

    if(!width)
        width = pageW - margin.left - margin.right;

    if(!maxHeight)
        maxHeight = pageH - margin.top - margin.bottom;

    const maxY = margin.top + maxHeight;

    //TODO validate margins, sizes, maxHeight, maxY (if maxHeight is present, it can't be larger than the available space)

    let x = margin.left,
        y = startY,
        lines = 0,
        lineHeight = 0,
        lineHeightFactor = doc.getLineHeightFactor();

    let stack = parseFormattedText(text);

    ///Measure only, this will give the caller the dimensions in order to draw something else below the text first

    doc.saveGraphicsState();

    //start in the next page if there isn't enoguh space for at least one line
    if(y + lineHeight > maxY) {
        this.data.push({ pageBreak: true });
        this.pages++;
        y = margin.top;
    }

    let skipToNextLine;

    for(let token of stack) {
        if(token.br) {
            skipToNextLine = false;

            x = margin.left;
            y += lineHeight;
            lines++;

            if(y > maxY || (numLines && lines > numLines)) {
                if(pageBreak) {
                    this.data.push({ pageBreak: true });
                    this.pages++;
                    y = margin.top;
                    lines = 0;
                } else {
                    break;
                }
            }

            this.data.push(token);
            continue;
        }

        if(token.bold) {
            doc.setFont(undefined, "bold");
            this.data.push(token);
            continue;
        }

        if(token.bold === false) {
            doc.setFont(undefined, "normal");
            this.data.push(token);
            continue;
        }

        if(skipToNextLine)
            continue;

        if(token.text) {
            let { w, h } = doc.getTextDimensions(token.text);

            h *= lineHeightFactor;

            if(h > lineHeight)
                lineHeight = h;

            if(x + w > width) {
                if(lineBreak) {
                    x = margin.left;
                    y += lineHeight;
                    lines++;
                } else {
                    skipToNextLine = true;

                    if(ellipsis && this.data.length)
                        this.data[this.data.length - 1].text = trim(this.data[this.data.length - 1].text, ".,; ") + "...";

                    continue;
                }
            }

            if(y > maxY || (numLines && lines > numLines)) {
                if(pageBreak) {
                    this.data.push({ pageBreak: true });
                    this.pages++;
                    x = margin.left;
                    y = margin.top;
                    lines = 0;
                } else if(ellipsis && this.data.length) {
                    this.data[this.data.length - 1].text = trim(this.data[this.data.length - 1].text, ".,; ") + "...";
                    break;
                }
            }

            token.x = x;
            token.y = y;
            this.data.push(token);

            x += w;
        }
    }

    this.finalY = y + lineHeight;
    this.finalHeight = this.pages == 1
        ? y - startY + lineHeight
        : y - margin.top + lineHeight;

    doc.restoreGraphicsState();

    this.draw = function () {
        doc.saveGraphicsState();

        for(let token of this.data) {
            if(token.br)
                continue;

            if(token.pageBreak) {
                doc.addPage();
                continue;
            }

            if(token.bold) {
                doc.setFont(undefined, "bold");
                continue;
            }

            if(token.bold === false) {
                doc.setFont(undefined, "normal");
                continue;
            }

            if(token.text)
                doc.text(token.text, token.x, token.y, { baseline });
        }

        doc.restoreGraphicsState();

        return this;
    };
}