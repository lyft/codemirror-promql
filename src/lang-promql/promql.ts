// The MIT License (MIT)
//
// Copyright (c) 2020 The Prometheus Authors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { LezerSyntax } from '@codemirror/next/syntax';
import { parser } from 'lezer-promql';
import { styleTags } from '@codemirror/next/highlight';
import { Extension } from '@codemirror/next/state';
import { CompleteConfiguration, CompleteStrategy, newCompleteStrategy } from './complete';
import { LintStrategy, newLintStrategy, promQLLinter } from './lint';
import { CompletionContext } from '@codemirror/next/autocomplete';

export const promQLSyntax = LezerSyntax.define(
  parser.withProps(
    styleTags({
      LineComment: 'comment',
      LabelName: 'labelName',
      StringLiteral: 'string',
      NumberLiteral: 'number',
      Duration: 'number',
      'Abs Absent AbsentOverTime AvgOverTime Ceil Changes ClampMax ClampMin CountOverTime DaysInMonth DayOfMonth DayOfWeek Delta Deriv Exp Floor HistogramQuantile HoltWinters Hour Idelta Increase Irate LabelReplace LabelJoin Ln Log10 Log2 MaxOverTime MinOverTime Minute Month PredictLinear QuantileOverTime Rate Resets Round Scalar Sort SortDesc Sqrt StddevOverTime StdvarOverTime SumOverTime Time Timestamp Vector Year':
        'functionName',
      'Avg Bottomk Count Count_values Group Max Min Quantile Stddev Stdvar Sum Topk': 'operatorKeyword',
      'By Without Bool On Ignoring GroupLeft GroupRight Offset': 'modifier',
      'And Unless Or': 'logicOperator',
      'Sub Add Mul Mod Div Eql Neq Lte Lss Gte Gtr EqlRegex EqlSingle NeqRegex Pow': 'operator',
      UnaryOp: 'arithmeticOperator',
      '( )': 'paren',
      '[ ]': 'squareBracket',
      '{ }': 'brace',
      '⚠': 'invalid',
    })
  ),
  {
    languageData: {
      closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`'] },
      commentTokens: { line: '#' },
    },
  }
);

/**
 * This class holds the state of the completion extension for CodeMirror and allow hot-swapping the complete strategy.
 */
export class PromQLExtension {
  private complete: CompleteStrategy;
  private readonly lint: LintStrategy;
  private enableCompletion: boolean;
  private enableLinter: boolean;

  constructor() {
    this.complete = newCompleteStrategy();
    this.lint = newLintStrategy();
    this.enableLinter = true;
    this.enableCompletion = true;
  }

  setComplete(conf?: CompleteConfiguration): PromQLExtension {
    this.complete = newCompleteStrategy(conf);
    return this;
  }

  activateCompletion(activate: boolean): PromQLExtension {
    this.enableCompletion = activate;
    return this;
  }

  activateLinter(activate: boolean): PromQLExtension {
    this.enableLinter = activate;
    return this;
  }

  asExtension(): Extension {
    let extension: Extension = [promQLSyntax];
    if (this.enableCompletion) {
      const completion = promQLSyntax.languageData.of({
        autocomplete: (context: CompletionContext) => {
          return this.complete.promQL(context);
        },
      });
      extension = extension.concat(completion);
    }
    if (this.enableLinter) {
      extension = extension.concat(promQLLinter(this.lint.promQL, this.lint));
    }
    return extension;
  }
}
