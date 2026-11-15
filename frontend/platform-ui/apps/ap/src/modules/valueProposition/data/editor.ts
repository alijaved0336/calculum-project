export const advancedTools = [
  ["Bold", "Italic", "Underline", "Strikethrough"],
  ["Subscript", "Superscript"],
  ["AlignLeft", "AlignCenter", "AlignRight", "AlignJustify"],
  ["Indent", "Outdent"],
  ["OrderedList", "UnorderedList"],
  "FontSize",
  "FontName",
  "FormatBlock",
  ["Undo", "Redo"],
  ["Link", "Unlink", "InsertImage", "ViewHtml"],
  ["InsertTable"],
  ["AddRowBefore", "AddRowAfter", "AddColumnBefore", "AddColumnAfter"],
  ["DeleteRow", "DeleteColumn", "DeleteTable"],
  ["MergeCells", "SplitCell"],
];

export const basicTools = [
    ["Bold", "Italic", "Underline", "Strikethrough"],
    ["AlignLeft", "AlignCenter", "AlignRight", "AlignJustify"],
    ["Indent", "Outdent","OrderedList", "UnorderedList"],    
    ["FontSize",
    "FontName"],
    ["FormatBlock"],
    ["Undo", "Redo"],"ViewHtml"
];

export const fontNames = [
  { text: 'Caveat', value: 'Caveat' },
  { text: 'Arial', value: 'Arial' },
  { text: 'Courier New', value: 'Courier New' },
  { text: 'Georgia', value: 'Georgia' },
  { text: 'Impact', value: 'Impact' },
  { text: 'Lucida Console', value: 'Lucida Console' },
  { text: 'Tahoma', value: 'Tahoma' },
  { text: 'Times New Roman', value: 'Times New Roman' },
  { text: 'Trebuchet MS', value: 'Trebuchet MS' },
  // { text: 'Verdana', value: 'Verdana' }
]


function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Replace placeholders with actual data
export function replacePlaceholders(
  html: string,
  replacements: Record<string, string>,
): string {
  let result = html;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(escapeRegExp(key), "g"), value);
  }
  return result;
}
