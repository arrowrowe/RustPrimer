const path = require('path');

const Promise = require('bluebird');

const shell = require('./shell');
const {read, write, glop} = require('./io');
const lg = require('./log');

const snippetPattern = /^ *``` *rust *[\r\n]((?:.|[\r\n])+?)[\r\n]+ *``` *$/mig;
const hasMainPattern = /^ *fn *main\(/m;
const wrapCode = code => `fn main() {\n${code}\n}`;
const ensureSnippet = code => hasMainPattern.test(code) ? code : wrapCode(code);
const extract = content => {
  const matches = [];
  let match;
  while (match = snippetPattern.exec(content)) {
    matches.push(ensureSnippet(match[1]));
  }
  return matches;
};

const countAll = {
  pass: 0,
  fail: 0
};

const DEST_DIR = path.resolve('logs', 'snippets');

const checkFile = file => {
  const codeDestDir = path.join(DEST_DIR, file);
  return read(file).then(extract).map(
    (code, index, length) => {
      index = index.toString();
      const codePrefix = `'${file}' ${length}:${index} `;
      lg.debug(codePrefix + 'write');
      const codeDest = path.join(codeDestDir, index + '.rs');
      const execDest = path.join(codeDestDir, index);
      return write(codeDest, code)
        .then(() => {
          lg.debug(codePrefix + 'compile');
          return shell.command(`rustc -o ${execDest} ${codeDest}`);
        })
        .then(() => {
          lg.debug(codePrefix + 'run');
          const execTask = shell.file(execDest);
          return shell.file(execDest).timeout(500);
        })
        .tap(() => {
          countAll.pass++;
          lg.debug(codePrefix + 'pass');
        })
        .catch(reason => {
          countAll.fail++;
          lg.error(codePrefix + 'error', reason.stderr || reason.message || reason);
        });
    }
  );
};

const checkFilesByPattern = pattern => glop(pattern).map(checkFile);

/**
 * PASS:
 *    1st-glance,appendix,cargo-detailed-cfg,cargo-projects-manager,editors,generic,
 *    install,marker,match,rcarc,safe,unsafe-rawpointer
 *
 * FAIL:
 *    action,any,attr-and-compiler-arg,closure,coding-style,collections,
 *    concurrency-parallel-thread,data-structure,error-handling,ffi,flow,function,
 *    heap-stack,intoborrow,iterator,macro,module,operator-overloading,
 *    ownership-system,quickstart,std,testing,trait,type
 */

// NOTE: this reads, compiles, runs ALL snippets CONCURRENTLY, burnning up your resources.
//       If you want a try, change the pattern to 'match/{*,*/readme}.md' may be a good idea.
// TODO: limit concurrent tasks count.
checkFilesByPattern('*/{*,*/readme}.md')
  .tap(lg.info.bind(lg))
  .tap(fileResults => lg.info(`
    ${fileResults.length} file(s) with ${countAll.pass + countAll.fail} test(s) in total,
    ${countAll.pass} pass, ${countAll.fail} fail.
  `));
