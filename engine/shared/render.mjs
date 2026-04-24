import Handlebars from 'handlebars';
import { resolve } from 'path';
import { readText } from './fs.mjs';
import { TEMPLATES_DIR } from './paths.mjs';

export function renderTemplate(templateName, context) {
  const source = readText(resolve(TEMPLATES_DIR, templateName));
  const compiled = Handlebars.compile(source);
  return compiled(context);
}
