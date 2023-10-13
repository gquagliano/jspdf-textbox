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

### Supported formats
- `**bold**`
- `*italic*`
- `***bold italic***`
- `_underlined_`
- `# Heading 1`
- `## Heading 2`
- Escape character: `\`

### Options
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
|`textAlign`|Text align, as `"left"`, `"right"`, `"center"`, `"justify"`, `"justify-right"` or `"justify-center"`.|`left`|
|`styles`|Styles for the different elements. See below.||

#### Styles
Only a couple of styles are supported so far.

|Property|Description|Default|
|--|--|--|
|`h1`|Heading 1||
|`h2`|Heading 2||
|`p`|Default text style||

*Supported styles:*
- `fontSize`
- `bold` (boolean)
- `italic` (boolean)
- `underline` (boolean)
- `marginBottom`
- `lineHeight` (line height factor)

*Note:* Paragraph style will be the document's text style at the moment of drawing. Font face, size and leading should not change between the `textBox` instance creation and the execution of `draw()`.

## TODO
1. Add more formatting tokens, including colors, links and images--or full Markdown support.
2. Add validations & friendly error messages.
3. Columns.
4. Hyphenate.
5. Position the box relative to the bottom margin of the page.
6. **Test!** The current version is a work in progress, use it at your own risk.