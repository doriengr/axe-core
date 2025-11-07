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
  const impactOrder = ['critical', 'serious', 'moderate', 'minor', 'none'];
  const byImpact = {};

  impactOrder.forEach(key => {
    byImpact[key] = mergedIssues.filter(issue => issue.impact === key);
  });

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
    passes: out.passes,
    summary: {
      totalChecks,
      passedChecks,
      successPercent
    }
  });
};

export default v3Reporter;
