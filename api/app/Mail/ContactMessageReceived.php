<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactMessageReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ContactMessage $contactMessage) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Contact] {$this->contactMessage->subject}",
            replyTo: [$this->contactMessage->email],
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.contact-message-received',
            with: [
                'senderName' => $this->contactMessage->name,
                'email' => $this->contactMessage->email,
                'subject' => $this->contactMessage->subject,
                'contactMessage' => $this->contactMessage->message,
            ],
        );
    }
}
