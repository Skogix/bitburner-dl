export async function main(_ns) {
}
export class Goal {
  condition;
  state;
  ns;
  name;
  /** @param {NS} ns */
  constructor(ns, name, condition) {
    this.ns = ns;
    this.name = name;
    this.condition = condition;
    this.state = void 0;
  }
}
export class Goals {
  ns;
  goals;
  /** @param {NS} ns */
  constructor(ns, logfile, goals) {
    this.ns = ns;
    this.logfile = logfile;
    this.goals = goals;
    this.LoadGoals();
  }
  ResetGoals() {
    if (this.ns.fileExists(this.logfile)) {
      this.ns.tprint("WARN: Initiating new Goals, resetting " + this.logfile);
      this.ns.rm(this.logfile);
    }
    for (const goal of this.goals) {
      goal.state = void 0;
    }
  }
  LoadGoals() {
    if (!this.ns.fileExists(this.logfile))
      return;
    const data = JSON.parse(this.ns.read(this.logfile));
    for (const line of data) {
      const goal = this.goals.find((s) => s.name == line.name);
      if (goal == void 0) {
        this.ns.tprint("FAIL: Could not find goal " + line.name);
        continue;
      }
      goal.state = line.state;
    }
  }
  logfile(_logfile) {
    throw new Error("Method not implemented.");
  }
  SaveGoals() {
    const data = [];
    for (const goal of this.goals) {
      data.push({ name: goal.name, state: goal.state });
    }
    this.ns.write(this.logfile, JSON.stringify(data), "w");
  }
  CheckGoals() {
    for (const goal of this.goals)
      this.CheckGoal(goal);
  }
  CheckGoal(goal) {
    const currentValue = goal.state != true ? goal.condition() : goal.state;
    switch (goal.state) {
      case void 0:
        goal.state = goal.condition();
        if (goal.state)
          this.ns.tprint("WARN: Goals: Already achieved goal " + goal.name + " on script startup");
        break;
      case false:
        if (currentValue) {
          goal.state = true;
          this.ns.tprint("FAIL: Goals: Achieved goal " + goal.name);
        }
        break;
      case true:
        break;
    }
    this.SaveGoals();
  }
}
