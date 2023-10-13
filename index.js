const { trim } = require("lodash");

/**
 * Parses a string and returns a list of instructions (tokens) to draw the text in the document.
 * @param {string} text - Input text.
 * @returns {object[]}
 */
function parseFormattedText(text) {
    //**bold**
    //*italic*
    //***bold italic***
    //_underlined_
    //# h1
    //## h2
    //escape char \

    let buffer = "",
        open = {
            h1: false,
            h2: false,
            bold: false,
            italic: false,
            underline: false
        },
        ignoreWhitespaces = false,
        stack = [],
        escaped = false;

    text = text.replace(/(\r\n|\n\r)/g, "\n");

    for(let i = 0; i < text.length; i++) {
        if(text[i] == "\\") {
            if(text[i + 1] == "\\") {
                buffer += "\\";
                i++;
            } else {
                escaped = true;
            }

            continue;
        }

        if(text[i] == "*" && text[i + 1] == "*" && !escaped) {
            if(buffer)
                stack.push({ text: buffer });
            buffer = "";

            open.bold = !open.bold;
            stack.push({ bold: open.bold });

            i++; //skip next *
            continue;
        }

        if(text[i] == "*" && !escaped) {
            if(buffer)
                stack.push({ text: buffer });
            buffer = "";

            open.italic = !open.italic;
            stack.push({ italic: open.italic });

            continue;
        }

        if(text[i] == "_" && !escaped) {
            if(buffer)
                stack.push({ text: buffer });
            buffer = "";

            open.underline = !open.underline;
            stack.push({ underline: open.underline });

            continue;
        }

        if(!buffer && text[i] == "#" && !escaped) {
            if(text[i + 1] == "#") {
                open.h2 = true;
                stack.push({ h2: true });
                i++; //skip next #
            } else {
                open.h1 = true;
                stack.push({ h1: true });
            }

            ignoreWhitespaces = true;
            continue;
        }

        if(text[i] == "\n") {
            if(buffer)
                stack.push({ text: buffer });
            buffer = "";
            stack.push({ br: true });

            if(open.h1 || open.h2)
                stack.push({ p: true });

            open.h1 = false;
            open.h2 = false;
            ignoreWhitespaces = false;

            continue;
        }

        if(text[i] == " ") {
            if(ignoreWhitespaces)
                continue;

            if(buffer)
                stack.push({ text: buffer });
            buffer = "";
            stack.push({ space: true });
            continue;
        }

        buffer += text[i];

        if(text[i] != " ")
            ignoreWhitespaces = false;

        escaped = false;
    }

    if(buffer)
        stack.push({ text: buffer });

    return stack;
}

/**
 * Updates the tokens horizontal positioning, if necessary, to justify one line of text.
 * @param {jsPDF} doc - jsPDF instance.
 * @param {object[]} tokens - List of tokens to update.
 * @param {number} startX - Start X value.
 * @param {number} lineWidth - Line width.
 * @param {string} textAlign - `left`, `right`, `center`, `justify`, `justify-right` or `justify-center`.
 * @param {boolean} br - Wether the line ended because of an implicit line break, or, if `false` an overflow.
 */
function justifyLine(doc, tokens, startX, maxWidth, textAlign, br) {
    if(!tokens.length)
        return;

    let lastToken,
        textWidth = 0,
        lineWidth = 0,
        wordCount = 0;
    for(let i = 0; i < tokens.length; i++) {
        if(tokens[i].text || tokens[i].space) {
            lastToken = tokens[i];
            wordCount++;
            textWidth += tokens[i].width;
        }
    }

    if(!lastToken)
        return;

    lineWidth = lastToken.x + lastToken.width - startX;

    if(lineWidth >= maxWidth)
        return;

    if(br) {
        if(textAlign == "justify-right")
            textAlign = "right";
        else if(textAlign == "justify-center")
            textAlign = "center";
        else if(textAlign == "justify")
            textAlign = "left";
    }

    if(textAlign == "right") {
        let add = maxWidth - lineWidth;
        for(let token of tokens)
            if(token.text || token.space)
                token.x += add;
        return;
    }

    if(textAlign == "center") {
        let add = (maxWidth - lineWidth) / 2;
        for(let token of tokens)
            if(token.text || token.space)
                token.x += add;
        return;
    }

    if(textAlign == "justify" || textAlign == "justify-right" || textAlign == "justify-center") {
        let spaceWidth = (maxWidth - textWidth) / (wordCount - 2),
            x = startX;
        for(let i = 0; i < tokens.length; i++)
            if(tokens[i].text || tokens[i].space) {
                tokens[i].x = x;
                x += tokens[i].width + spaceWidth;
            }
        return;
    }
}

/**
 * Creates a new textbox to be drawn on the provided jsPDF instance. The dimensions are computed immediately; call `draw()` to actually draw the text
 * on the page. All values are in the document's unit.
 * @param {jsPDF} doc - jsPDF instance.
 * @param {string} text - Text to draw.
 * @param {object} [options] - Options.
 * @param {number} [options.startY] - Initial Y position. The default value is the top margin.
 * @param {(object|number)} [options.margin] - Page margins as a number (all margins will be equal), or as an object `{top, bottom, left, right}`.
 * @param {number} [options.width] - Width of the text box. By default, it's the page width minus margins.
 * @param {string} [options.baseline] - Baseline option for the jsPDF `text()` function (see jsPDF docs). By default, it's `top`.
 * @param {number} [options.numLines] - Limit the number of lines to be drawn.
 * @param {number} [options.maxHeight] - Maximum height. This will disable page breaks even if the value is greater than the available space in the page.
 * @param {boolean} [options.ellipsis] - Wether or not to add ellipsis if the text overflows the box.
 * @param {boolean} [options.lineBreak] - If `false`, lines won't break unless a `\n` is found. Default value is `true`.
 * @param {boolean} [options.pageBreak] - Wether or not to add new pages if necessary. Default value is `true`.
 * @param {string} [options.textAlign] - Text align, as `"left"` (default), `"right"`, `"center"`, `"justify"`, `"justify-right"` or `"justify-center"`.
 * @param {object} [styles] - Styles.
 * @constructs {TextBox}
 */
function textBox(doc, text, { startY = 0, margin, width, baseline = "top", numLines, maxHeight, ellipsis, lineBreak = true, pageBreak = true, wordBreak, textAlign = "left", styles = {} }) {
    this.data = [];
    this.pages = 1;
    this.finalY = 0;
    this.finalHeight = 0;

    let defaultStyle = {
        fontSize: doc.getFontSize(),
        bold: false,
        italic: false,
        underline: false
    };

    /**
     * 
     */
    this.compile = function () {
        const pageW = doc.internal.pageSize.getWidth(),
            pageH = doc.internal.pageSize.getHeight();

        if(typeof margin == "number")
            margin = {
                left: margin,
                top: margin,
                bottom: margin,
                right: margin
            };

        if(!startY)
            startY = margin.top;

        if(!width)
            width = pageW - (margin.left || 0) - (margin.right || 0);

        if(!maxHeight)
            maxHeight = pageH - (margin.top || 0) - (margin.bottom || 0);

        if(typeof margin.top == "undefined")
            margin.top = startY;

        if(typeof margin.left == "undefined")
            if(typeof margin.right == "number")
                margin.left = pageW - margin.right - width;
            else
                margin.left = 0;

        //TODO position box relative to the bottom of the page--this would require computing the actual height first

        const maxY = margin.top + maxHeight,
            maxX = margin.left + width;

        //TODO validate margins, sizes, maxHeight, maxY (if maxHeight is present, it can't be larger than the available space)

        let x = margin.left,
            y = startY,
            lines = 1,
            prevLineHeightFactor = doc.getLineHeightFactor(),
            lineHeight = computeCurrentLineHeight(defaultStyle);

        let stack = parseFormattedText(text),
            currentTextAign = textAlign, //in the future, there might be a token to set the next paragraph align
            skipToNextLine,
            currentStyle,
            currentLineStart = 0;

        doc.saveGraphicsState();

        doc.setLineHeightFactor(1);

        //start in the next page if there isn't enoguh space for at least one line
        if(y + lineHeight > maxY) {
            this.data.push({ pageBreak: true });
            this.pages++;
            y = margin.top;
        }

        for(let i = 0; i < stack.length; i++) {
            let token = stack[i];

            if(token.br) {
                skipToNextLine = false;

                x = margin.left;
                y += (currentStyle?.marginBottom || 0) + lineHeight;
                lines++;

                getLineAndJustify(this.data, currentLineStart, currentTextAign, true);
                currentLineStart = this.data.length;

                if(y > maxY || (numLines && lines > numLines)) {
                    if(pageBreak) {
                        this.data.push({ pageBreak: true });
                        this.pages++;
                        y = margin.top;
                        lines = 1;
                    } else {
                        break;
                    }
                }

                continue;
            }

            if(token.h1) {
                currentStyle = applyStyles(styles.h1);
                lineHeight = computeCurrentLineHeight(currentStyle);
                this.data.push(token);
                continue;
            }

            if(token.h2) {
                currentStyle = applyStyles(styles.h2);
                lineHeight = computeCurrentLineHeight(currentStyle);
                this.data.push(token);
                continue;
            }

            if(token.p) {
                currentStyle = applyStyles(); //revert to default
                lineHeight = computeCurrentLineHeight(currentStyle);
                this.data.push(token);
                continue;
            }

            if(token.bold) {
                currentStyle = applyStyles({ bold: true });
                this.data.push(token);
                continue;
            }

            if(token.bold === false) {
                currentStyle = applyStyles({ bold: false });
                this.data.push(token);
                continue;
            }

            if(token.italic) {
                currentStyle = applyStyles({ italic: true });
                this.data.push(token);
                continue;
            }

            if(token.italic === false) {
                currentStyle = applyStyles({ italic: false });
                this.data.push(token);
                continue;
            }

            if(token.underline) {
                currentStyle = applyStyles({ underline: true });
                this.data.push(token);
                continue;
            }

            if(token.underline === false) {
                currentStyle = applyStyles({ underline: false });
                this.data.push(token);
                continue;
            }

            if(skipToNextLine)
                continue;

            if(token.space) {
                let { w, h } = doc.getTextDimensions(" "); //the width can change in each iteration

                token.x = x;

                x += w;

                if(x >= maxX) {
                    if(lineBreak) {
                        x = margin.left;
                        y += currentStyle?.marginBottom || lineHeight;
                        lines++;
                    } else {
                        skipToNextLine = true;

                        if(ellipsis)
                            addEllipsis(this.data);
                    }

                    getLineAndJustify(this.data, currentLineStart, currentTextAign);
                    currentLineStart = this.data.length;
                }

                if(y > maxY || (numLines && lines > numLines)) {
                    if(pageBreak) {
                        this.data.push({ pageBreak: true });
                        this.pages++;
                        x = margin.left;
                        y = margin.top;
                        lines = 1;
                    } else {
                        if(ellipsis)
                            addEllipsis(this.data);

                        break;
                    }
                }

                token.y = y;
                token.width = w;
                token.height = h;
                this.data.push(token);

                continue;
            }

            if(token.text) {
                let { w, h } = doc.getTextDimensions(token.text);

                if(x + w > maxX) {
                    if(lineBreak) {
                        x = margin.left;
                        y += currentStyle?.marginBottom || lineHeight;
                        lines++;
                    } else {
                        skipToNextLine = true;

                        if(ellipsis)
                            addEllipsis(this.data);
                    }

                    getLineAndJustify(this.data, currentLineStart, currentTextAign);
                    currentLineStart = this.data.length;

                    if(!lineBreak)
                        continue;
                }

                if(y > maxY || (numLines && lines > numLines)) {
                    if(pageBreak) {
                        this.data.push({ pageBreak: true });
                        this.pages++;
                        x = margin.left;
                        y = margin.top;
                        lines = 1;
                    } else {
                        if(ellipsis)
                            addEllipsis(this.data);

                        break;
                    }
                }

                token.x = x;
                token.y = y;
                token.width = w;
                token.height = h;
                this.data.push(token);

                x += w;
            }
        }

        getLineAndJustify(this.data, currentLineStart, currentTextAign, true);

        this.finalY = y + lineHeight;
        this.finalHeight = this.pages == 1
            ? y - startY + lineHeight
            : y - margin.top + lineHeight;

        doc.restoreGraphicsState();
        //save/restore doesn't preserve line height factor
        doc.setLineHeightFactor(prevLineHeightFactor);
    };

    /**
     * 
     * @param {object} style 
     * @returns {number}
     */
    function computeCurrentLineHeight(style) {
        let lineHeightFactor = style?.lineHeight || doc.getLineHeightFactor(),
            { h: lineHeight } = doc.getTextDimensions("test");

        return lineHeight * lineHeightFactor;
    }

    /**
     * 
     * @param {object} styles 
     * @returns {object}
     */
    function applyStyles(styles) {
        if(typeof styles == "undefined")
            styles = defaultStyle;

        let type = "normal",
            { fontStyle } = doc.getFont();

        if(styles.bold)
            type = fontStyle == "italic"
                ? "bolditalic"
                : "bold";

        if(styles.italic)
            type = fontStyle == "bold"
                ? "bolditalic"
                : "italic";

        if(styles.bold === false)
            type = fontStyle == "bolditalic"
                ? "italic"
                : "normal";

        if(styles.italic === false)
            type = fontStyle == "bolditalic"
                ? "bold"
                : "normal";

        doc.setFont(undefined, type);

        if(styles.fontSize)
            doc.setFontSize(styles.fontSize);

        return styles;
    }

    /**
     * 
     * @param {object[]} data 
     */
    function addEllipsis(data) {
        if(!data.length)
            return;

        for(let i = data.length - 1; i >= 0; i--) {
            if(!data[i].text)
                continue;
            data[i].text = trim(data[i].text, ".,; ") + "...";
            data[i].width = doc.getTextDimensions(data[i].text).w;
            break;
        }
    }

    /**
     * 
     * @param {object[]} data 
     * @param {number} lineStart 
     * @param {string} textAlign 
     * @param {boolean} br 
     */
    function getLineAndJustify(data, lineStart, textAlign, br) {
        let line = data.slice(lineStart);
        justifyLine(doc, line, margin.left, width, textAlign, br);
    }

    /**
     * Draws the current instance on the document.
     * @returns {TextBox}
     */
    this.draw = function () {
        doc.saveGraphicsState();

        let underline = false;

        for(let token of this.data) {
            if(token.pageBreak) {
                doc.addPage();
                continue;
            }

            if(token.h1) {
                applyStyles(styles.h1);
                continue;
            }

            if(token.h2) {
                applyStyles(styles.h2);
                continue;
            }

            if(token.p) {
                applyStyles(); //revert to default
                continue;
            }

            if(token.bold) {
                applyStyles({ bold: true });
                continue;
            }

            if(token.bold === false) {
                applyStyles({ bold: false });
                continue;
            }

            if(token.italic) {
                applyStyles({ italic: true });
                continue;
            }

            if(token.italic === false) {
                applyStyles({ italic: false });
                continue;
            }

            if(token.underline) {
                underline = true;
                continue;
            }

            if(token.underline === false) {
                underline = false;
                continue;
            }

            if(token.text || token.space) {
                //display box around the token for debugging purposes
                //doc.setDrawColor("black")
                //    .setLineWidth(.1)
                //    .rect(token.x, token.y, token.width, token.height);

                if(token.text)
                    doc.text(token.text, token.x, token.y, { baseline });

                if(underline) {
                    let offsetY = token.height * 1.18;
                    doc.setLineWidth(doc.getFontSize() * .03)
                        .setDrawColor(doc.getTextColor())
                        .line(token.x, token.y + offsetY, token.x + token.width, token.y + offsetY);
                }
            }
        }

        doc.restoreGraphicsState();

        return this;
    };

    //Measure only, this will give the caller the dimensions in order to draw something else below the text first
    this.compile();
}

module.exports = {
    textBox
};