/**
 * Validation Middleware - HIPAA Compliant
 * Request validation using Joi schemas
 */

const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errorDetails
            });
        }

        // Replace req.body with validated/sanitized data
        req.body = value;
        next();
    };
};

module.exports = {
    validateRequest
};