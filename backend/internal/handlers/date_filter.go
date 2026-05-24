package handlers

import (
	"strings"
	"time"
)

func parseFlexibleDateTime(s string, endOfDay bool) (*time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return &t, nil
	}
	t, err := time.ParseInLocation("2006-01-02", s, time.UTC)
	if err != nil {
		return nil, err
	}
	if endOfDay {
		next := t.Add(24 * time.Hour)
		return &next, nil
	}
	return &t, nil
}
