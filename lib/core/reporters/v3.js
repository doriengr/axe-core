import { processAggregate, failureSummary } from './helpers';
import { getEnvironmentData } from '../utils';

const v3Reporter = (results, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const { environmentData, ...toolOptions } = options;
  const out = processAggregate(results, options);

  const addFailureSummaries = result => {
    result.nodes.forEach(nodeResult => {
      nodeResult.failureSummary = failureSummary(nodeResult);
    });
  };

  out.incomplete.forEach(addFailureSummaries);
  out.violations.forEach(addFailureSummaries);

  // Merge violations and incomplete together
  let mergedIssues = [...out.violations, ...out.incomplete];

  // Nodes with same id should be grouped together
  const groupedIssuesMap = {};
  mergedIssues.forEach(issue => {
    if (groupedIssuesMap[issue.id]) {
      groupedIssuesMap[issue.id].nodes.push(...issue.nodes);
    } else {
      groupedIssuesMap[issue.id] = { ...issue, nodes: [...issue.nodes] };
    }
  });

  mergedIssues = Object.values(groupedIssuesMap);

  // Group merged problems by impact
  const impactOrder = ['critical', 'serious', 'moderate', 'minor'];
  const byImpact = impactOrder.map(key => ({
    impact: key,
    errors: mergedIssues.filter(issue => issue.impact === key)
  }));

  // Group merged problems by conformance level
  const conformanceMap = {
    A: ['wcag2a', 'wcag21a'],
    AA: ['wcag2aa', 'wcag21aa', 'wcag22aa'],
    AAA: ['wcag2aaa']
  };

  const byConformanceLevel = Object.entries(conformanceMap).map(
    ([level, tags]) => ({
      level,
      errors: mergedIssues.filter(
        issue =>
          issue.tags && issue.tags.some(tag => tags.includes(tag.toLowerCase()))
      )
    })
  );

  // Calculate total checks and successful percentage
  const passedChecks = out.passes ? out.passes.length : 0;
  const totalChecks = mergedIssues.length + passedChecks;
  const successPercent =
    totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : null;

  callback({
    ...getEnvironmentData(environmentData),
    toolOptions,
    byImpact,
    byConformanceLevel,
    passes: out.passes,
    summary: {
      totalChecks,
      passedChecks,
      successPercent
    }
  });
};

export default v3Reporter;
