import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

const caseSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(20),
  mustContain: z.array(z.string().min(2)).min(1),
});

const casesSchema = z.array(caseSchema).min(1);

async function main() {
  const target = resolve(process.cwd(), "tests/prompt-regression/smoke.cases.json");
  const raw = await readFile(target, "utf-8");
  const cases = casesSchema.parse(JSON.parse(raw));

  const failures: string[] = [];
  for (const testCase of cases) {
    const normalizedPrompt = testCase.prompt.toLowerCase();
    for (const required of testCase.mustContain) {
      if (!normalizedPrompt.includes(required.toLowerCase())) {
        failures.push(`${testCase.id}: missing keyword '${required}' in prompt`);
      }
    }
  }

  if (failures.length) {
    console.error("Prompt smoke regression failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Prompt smoke regression passed (${cases.length} cases).`);
}

void main();
