package cli

import (
	"github.com/urfave/cli/v3"
)

// NewApp returns the root CLI command with all subcommands.
func NewApp() *cli.Command {
	return &cli.Command{
		Name:  "mirage",
		Usage: "AI-powered document processing server",
		Commands: []*cli.Command{
			runCmd(),
			openAPICmd(),
		},
	}
}
