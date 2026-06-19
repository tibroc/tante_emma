package main

import (
	"context"
	"encoding/json"
	"fmt"
)

const mcpVersion = "2024-11-05"

// JSON-RPC 2.0 types.

type jsonRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"` // null / absent for notifications
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type jsonRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Result  any             `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// mcpTool describes one callable tool and its handler.
type mcpTool struct {
	Name        string
	Description string
	InputSchema map[string]any
	// Handler returns the text content to return to the LLM, or an error that
	// is surfaced as an isError=true tool result (not a JSON-RPC protocol error).
	Handler func(ctx context.Context, args map[string]any) (string, error)
}

type server struct {
	client *apiClient
	tools  []*mcpTool
	byName map[string]*mcpTool
}

func newServer(client *apiClient) *server {
	tools := buildTools(client)
	s := &server{client: client, tools: tools, byName: make(map[string]*mcpTool, len(tools))}
	for _, t := range tools {
		s.byName[t.Name] = t
	}
	return s
}

func (s *server) handle(ctx context.Context, req *jsonRPCRequest) *jsonRPCResponse {
	switch req.Method {
	case "initialize":
		return okResp(req.ID, map[string]any{
			"protocolVersion": mcpVersion,
			"capabilities":    map[string]any{"tools": map[string]any{}},
			"serverInfo":      map[string]any{"name": "tanteemma", "version": "1.0.0"},
		})

	case "notifications/initialized", "notifications/cancelled":
		return nil // notifications never get a response

	case "ping":
		return okResp(req.ID, map[string]any{})

	case "tools/list":
		list := make([]map[string]any, len(s.tools))
		for i, t := range s.tools {
			list[i] = map[string]any{
				"name":        t.Name,
				"description": t.Description,
				"inputSchema": t.InputSchema,
			}
		}
		return okResp(req.ID, map[string]any{"tools": list})

	case "tools/call":
		return s.callTool(ctx, req)

	default:
		return errResp(req.ID, -32601, "method not found: "+req.Method)
	}
}

func (s *server) callTool(ctx context.Context, req *jsonRPCRequest) *jsonRPCResponse {
	var p struct {
		Name      string         `json:"name"`
		Arguments map[string]any `json:"arguments"`
	}
	if err := json.Unmarshal(req.Params, &p); err != nil {
		return errResp(req.ID, -32602, "invalid params: "+err.Error())
	}

	tool, ok := s.byName[p.Name]
	if !ok {
		return errResp(req.ID, -32601, fmt.Sprintf("unknown tool: %s", p.Name))
	}

	args := p.Arguments
	if args == nil {
		args = map[string]any{}
	}

	text, err := tool.Handler(ctx, args)
	if err != nil {
		return okResp(req.ID, contentResult(true, "Error: "+err.Error()))
	}
	return okResp(req.ID, contentResult(false, text))
}

func okResp(id json.RawMessage, result any) *jsonRPCResponse {
	return &jsonRPCResponse{JSONRPC: "2.0", ID: id, Result: result}
}

func errResp(id json.RawMessage, code int, msg string) *jsonRPCResponse {
	return &jsonRPCResponse{JSONRPC: "2.0", ID: id, Error: &rpcError{Code: code, Message: msg}}
}

func contentResult(isErr bool, text string) map[string]any {
	return map[string]any{
		"content": []map[string]any{{"type": "text", "text": text}},
		"isError": isErr,
	}
}
