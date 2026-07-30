<?php

namespace App\Mail;

use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SupportTicketReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public SupportTicket $ticket)
    {
        $this->ticket->loadMissing('user');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Support] {$this->ticket->subject}",
            replyTo: [$this->ticket->email],
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.support-ticket-received',
            with: [
                'userName' => $this->ticket->user->name,
                'email' => $this->ticket->email,
                'subject' => $this->ticket->subject,
                'ticketMessage' => $this->ticket->message,
            ],
        );
    }
}
