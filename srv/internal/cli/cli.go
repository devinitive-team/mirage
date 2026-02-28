package cli

import (
	"fmt"
	"os"
)

// Run dispatches the CLI subcommand given in args.
func Run(args []string) {
	if len(args) == 0 {
		printHelp()
		os.Exit(1)
	}

	switch args[0] {
	case "run":
		runServer()
	case "openapi":
		runOpenAPI()
	case "help", "-h", "--help":
		printHelp()
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n\n", args[0])
		printHelp()
		os.Exit(1)
	}
}

func printHelp() {
	fmt.Print(`Usage: mirage <command>

Commands:
  run       Start the HTTP server
  openapi   Print the OpenAPI spec to stdout
  help      Show this help message
`)
}
