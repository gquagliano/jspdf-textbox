
# jsPDF Textbox  

Rich text boxes for jsPDF.  

This library lets you:

- Add rich text to your jsPDF documents, using a syntax similar to Markdown.
- Create text boxes with overflow control, horizontally and vertically, and spawning multiple pages.
- Compute text boxes dimensions, useful to arrange other document elements or draw other stuff relative to the text (like backgrounds).

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

let myTextBox = new textBox(doc, "**Hello**", {
	//options, see jsdoc
});

//In case you need the text box dimensions before actually drawing it:
//myTextBox.pages - Number of pages used up by the text box
//myTextBox.finalY - Final Y position (last page)
//myTextBox.finalHeight - Height of the text box (last page)

myTextBox.draw();
````
  
## Supported formats (so far)
- `**bold**`

## TODO
1. Add more formatting tokens, including colors, or a full support for Markdown.
2. Add tokens/tags for elements such as links and images.
3. Text align (option `textAlign` not implemented).
4. Columns.
5. Word break (option `wordBreak` not implemented).
6. Add validations.
7. Complete documentation.
8. **Test!** The current version is a work in progress, use it at your own risk.