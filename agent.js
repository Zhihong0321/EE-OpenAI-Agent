import { webSearchTool, fileSearchTool, Agent, Runner, withTrace } from "@openai/agents";
import { z } from "zod";

// Tool definitions
const webSearchPreview = webSearchTool({
  searchContextSize: "medium",
  userLocation: {
    type: "approximate"
  }
});

const fileSearch = fileSearchTool(["vs_69156d1026088191a49150f079b0f1f9"]);

const ClassifySchema = z.object({ 
  operating_procedure: z.enum(["q-and-a", "fact-finding", "other"]) 
});

const queryRewrite = new Agent({
  name: "Query rewrite",
  instructions: "Rewrite the user's question to be more specific and relevant to the knowledge base.",
  model: "gpt-5-nano-2025-08-07",
  modelSettings: {
    reasoning: {
      effort: "low"
    },
    store: true
  }
});

const classify = new Agent({
  name: "Classify",
  instructions: "Determine whether the question should use the Q&A or fact-finding process.",
  model: "gpt-5-nano-2025-08-07",
  outputType: ClassifySchema,
  modelSettings: {
    reasoning: {
      effort: "low"
    },
    store: true
  }
});

const internalQA = new Agent({
  name: "Internal Q&A",
  instructions: "Answer the user's question using the knowledge tools you have on hand (file or web search). Be concise and answer succinctly, using bullet points and summarizing the answer up front",
  model: "gpt-5-nano-2025-08-07",
  tools: [webSearchPreview],
  modelSettings: {
    reasoning: {
      effort: "low"
    },
    store: true
  }
});

const externalFactFinding = new Agent({
  name: "External fact finding",
  instructions: `Explore external information using the tools you have (web search, file search, code interpreter). Analyze any relevant data, checking your work.
Make sure to output a concise answer followed by summarized bullet point of supporting evidence`,
  model: "gpt-5-nano-2025-08-07",
  tools: [fileSearch, webSearchPreview],
  modelSettings: {
    reasoning: {
      effort: "low"
    },
    store: true
  }
});

const agent = new Agent({
  name: "Agent",
  instructions: "Ask the user to provide more detail so you can help them by either answering their question or running data analysis relevant to their query",
  model: "gpt-5-nano-2025-08-07",
  modelSettings: {
    reasoning: {
      effort: "medium"
    },
    store: true
  }
});

export const runWorkflow = async (inputText) => {
  return await withTrace("Test Q&A Based ON FILE", async () => {
    const conversationHistory = [{
      role: "user",
      content: [{
        type: "input_text",
        text: inputText
      }]
    }];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_691569b64d8c8190bca23042115a5df802af72bda36aeb21"
      }
    });

    // Step 1: Query Rewrite
    const queryRewriteResultTemp = await runner.run(queryRewrite, [
      ...conversationHistory,
      {
        role: "user",
        content: [{
          type: "input_text",
          text: `Original question: ${inputText}`
        }]
      }
    ]);

    conversationHistory.push(...queryRewriteResultTemp.newItems.map((item) => item.rawItem));

    if (!queryRewriteResultTemp.finalOutput) {
      throw new Error("Query rewrite result is undefined");
    }

    const queryRewriteResult = {
      output_text: queryRewriteResultTemp.finalOutput ?? ""
    };

    // Step 2: Classify
    const classifyResultTemp = await runner.run(classify, [
      ...conversationHistory,
      {
        role: "user",
        content: [{
          type: "input_text",
          text: `Question: ${queryRewriteResult.output_text}`
        }]
      }
    ]);

    conversationHistory.push(...classifyResultTemp.newItems.map((item) => item.rawItem));

    if (!classifyResultTemp.finalOutput) {
      throw new Error("Classify result is undefined");
    }

    const classifyResult = {
      output_text: JSON.stringify(classifyResultTemp.finalOutput),
      output_parsed: classifyResultTemp.finalOutput
    };

    // Step 3: Route to appropriate agent
    if (classifyResult.output_parsed.operating_procedure == "q-and-a") {
      const internalQAResultTemp = await runner.run(internalQA, [...conversationHistory]);
      conversationHistory.push(...internalQAResultTemp.newItems.map((item) => item.rawItem));

      if (!internalQAResultTemp.finalOutput) {
        throw new Error("Internal Q&A result is undefined");
      }

      return {
        type: "q-and-a",
        rewrittenQuery: queryRewriteResult.output_text,
        answer: internalQAResultTemp.finalOutput
      };
    } else if (classifyResult.output_parsed.operating_procedure == "fact-finding") {
      const externalFactFindingResultTemp = await runner.run(externalFactFinding, [...conversationHistory]);
      conversationHistory.push(...externalFactFindingResultTemp.newItems.map((item) => item.rawItem));

      if (!externalFactFindingResultTemp.finalOutput) {
        throw new Error("External fact finding result is undefined");
      }

      return {
        type: "fact-finding",
        rewrittenQuery: queryRewriteResult.output_text,
        answer: externalFactFindingResultTemp.finalOutput
      };
    } else {
      const agentResultTemp = await runner.run(agent, [...conversationHistory]);
      conversationHistory.push(...agentResultTemp.newItems.map((item) => item.rawItem));

      if (!agentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
      }

      return {
        type: "other",
        rewrittenQuery: queryRewriteResult.output_text,
        answer: agentResultTemp.finalOutput
      };
    }
  });
};
