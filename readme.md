# jsPDF TextBox  

Rich text boxes for jsPDF.  

This library lets you:

- Add rich text to your jsPDF documents, using a syntax similar to Markdown.
- Create text boxes with horizontal/vertical overflow control, and page breaks.
- Compute text boxes dimensions, useful to arrange other document elements relative to the text (like backgrounds).

## Usage

### Install
````
npm i @gquagliano/jspdf-textbox
````

### Usage
````
import  jsPDF  from  "jspdf";
import textBox from "@gquagliano/jspdf-textbox";

let doc = new jsPDF();

let myTextBox = new textBox(doc, "**Hello** World", {
	//options
});

//In case you need the text box dimensions before actually drawing it:
//myTextBox.pages - Number of pages used up by the text box
//myTextBox.finalY - Final Y position (last page)
//myTextBox.finalHeight - Height of the text box (last page)

myTextBox.draw();
````

#### Options
|Option|Description|Default value|
|--|--|--|
|`startY`|Initial Y position.|Top margin.|
|`margin`|Page margins as a number (all margins will be equal), or as an object `{top, bottom, left, right}`|`0`|
|`width`|Width of the text box|Page width minus margins.|
|`baseline`|Baseline option for the jsPDF `text()` function (see jsPDF docs)|`top`|
|`numLines`|Limit the number of lines to be drawn.||
|`maxHeight`|Maximum height. This will disable page breaks even if the value is greater than the available space in the page.||
|`ellipsis`|Wether or not to add ellipsis if the text overflows the box.|`false`|
|`lineBreak`|`false`, lines won't break unless a `\n` is found.|`true`|
|`pageBreak`|Wether or not to add new pages if necessary.|`true`|
|`wordBreak`|Wether or not to break words.|`false`|
|`textAlign`|Text align, as `"left"`, `"right"` or `"center"`.|`left`|
  
## Supported formats
- `**bold**`

## TODO
1. Add more formatting tokens, including colors, or a full support for Markdown.
2. Add tokens/tags for elements such as links and images.
3. Justify text.
4. Columns.
5. Word break (option `wordBreak` not implemented).
6. Add validations.
7. **Test!** The current version is a work in progress, use it at your own risk.