# Imposition

**Imposition** is the printer's word for arranging pages on a big sheet so that, after printing, folding and cutting, they come out in the right order. A zine page is almost never next to the page that follows it: on an eight-page minizine, page 1 and page 8 share a quarter of the sheet, and half of the pages are printed upside down.

The ZineArranger does this in four steps, each with its own page:

1. [Layouts](zinearranger/imposition/layouts): the table of "which page goes in which cell", for every size and option.
2. [Signatures](zinearranger/imposition/signatures): how sheets are grouped and nested into stacks that are folded together.
3. [Arranging sheets](zinearranger/imposition/arrange-sheets): the function that pads the page count, picks the layout and works out each cell's page.
4. [Sheet HTML](zinearranger/imposition/sheet-html): turning the result into the sheets you see and print.
