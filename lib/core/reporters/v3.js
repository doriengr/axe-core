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
  const mergedIssues = [...out.violations, ...out.incomplete];

  // Group merged problems by impact
  const impactOrder = ['critical', 'serious', 'moderate', 'minor'];
  const byImpact = impactOrder.map(key => ({
    impact: key,
    errors: mergedIssues.filter(issue => issue.impact === key)
  }));

  // Group merged problems by conformance level
  const conformanceLevels = ['wcag2a', 'wcag2aa', 'wcag2aaa'];
  const byConformanceLevel = conformanceLevels.map(level => ({
    level,
    errors: mergedIssues.filter(
      issue => issue.tags && issue.tags.some(tag => tag.toLowerCase() === level)
    )
  }));

  // Calculate total checks and successful percentage
  const totalChecks =
    mergedIssues.length + (out.passes ? out.passes.length : 0);
  const passedChecks = out.passes ? out.passes.length : 0;
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
