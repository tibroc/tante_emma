// tanteemma-mcp is a Model Context Protocol server that exposes TanteEmma
// shopping lists to LLM assistants via the stdio transport.
//
// Configuration via environment variables:
//
//	TANTEEMMA_URL   — base URL of the TanteEmma backend (default: http://localhost:8080)
//	TANTEEMMA_TOKEN — Personal Access Token with read+write scope
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
)

func main() {
	token := os.Getenv("TANTEEMMA_TOKEN")
	if token == "" {
		fmt.Fprintln(os.Stderr, "error: TANTEEMMA_TOKEN environment variable is required")
		os.Exit(1)
	}
	baseURL := os.Getenv("TANTEEMMA_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}

	client := newAPIClient(baseURL, token)
	srv := newServer(client)

	// MCP stdio transport: one JSON object per line, newline-delimited.
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 4<<20), 4<<20) // 4 MiB — generous for large list responses
	enc := json.NewEncoder(os.Stdout)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var req jsonRPCRequest
		if err := json.Unmarshal(line, &req); err != nil {
			log.Printf("mcp: invalid json: %v", err)
			continue
		}

		resp := srv.handle(context.Background(), &req)
		if resp == nil {
			continue // notification — no response required
		}
		if err := enc.Encode(resp); err != nil {
			log.Printf("mcp: encode response: %v", err)
		}
	}
	if err := scanner.Err(); err != nil {
		log.Fatalf("mcp: stdin: %v", err)
	}
}
